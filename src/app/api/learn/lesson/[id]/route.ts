// ADAF Academy - Individual Lesson API
// GET /api/learn/lesson/[id] - Get detailed lesson information with quiz, checklist, and exercises

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth/rbac';
import { incApiRequest } from '@/lib/metrics';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const startTime = Date.now();
  let status = 200;
  
  try {
    // RBAC: Lessons are viewable by all authenticated users
    await requireRole('viewer');
    
    const { id: lessonId } = await params;
    
    // Validate UUID format
    const uuidSchema = z.string().uuid();
    uuidSchema.parse(lessonId);
    
    // Get lesson details
    const lessonResult = await db.$queryRaw`
      SELECT 
        id, code, title, summary, difficulty, est_minutes,
        content_md, kind, tags, prerequisites, 
        created_at, updated_at, enabled
      FROM lessons 
      WHERE id = ${lessonId} AND enabled = true
    `;
    
    if (!Array.isArray(lessonResult) || lessonResult.length === 0) {
      return NextResponse.json({
        error: 'Lesson not found or disabled',
        lessonId
      }, { status: 404 });
    }
    
    const lesson = lessonResult[0] as any;
    
    // Get quiz for this lesson
    const quizResult = await db.$queryRaw`
      SELECT id, title, description, items, pass_percentage, time_limit_minutes
      FROM quizzes 
      WHERE lesson_id = ${lessonId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const quiz = (Array.isArray(quizResult) && quizResult.length > 0) ? quizResult[0] : null;
    
    // Get checklist for this lesson  
    const checklistResult = await db.$queryRaw`
      SELECT id, title, description, items, min_completion_percentage
      FROM checklists
      WHERE lesson_id = ${lessonId}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const checklist = (Array.isArray(checklistResult) && checklistResult.length > 0) ? checklistResult[0] : null;
    
    // Get exercises for this lesson
    const exercisesResult = await db.$queryRaw`
      SELECT 
        id, title, description, action, action_params,
        verify_method, verify_params, points, required_role,
        environment_restriction, created_at
      FROM exercises
      WHERE lesson_id = ${lessonId}
      ORDER BY created_at ASC
    `;
    const exercises = Array.isArray(exercisesResult) ? exercisesResult : [];
    
    // Get user progress for this lesson
    const userId = request.headers.get('x-user-id') || 'anonymous';
    let userProgress = null;
    
    if (userId !== 'anonymous') {
      const progressResult = await db.$queryRaw`
        SELECT 
          status, completion_percentage, quiz_score, total_points,
          checklist_state, exercise_results, started_at, 
          completed_at, last_activity_at
        FROM user_progress
        WHERE user_id = ${userId} AND lesson_id = ${lessonId}
      `;
      
      userProgress = (Array.isArray(progressResult) && progressResult.length > 0) ? progressResult[0] : {
        status: 'not_started',
        completion_percentage: 0,
        quiz_score: null,
        total_points: 0,
        checklist_state: {},
        exercise_results: {},
        started_at: null,
        completed_at: null,
        last_activity_at: null
      };
    }
    
    // Get related lessons (prerequisites and next steps)
    let relatedLessons: any = {};
    
    if (lesson.prerequisites && lesson.prerequisites.length > 0) {
      const prereqResult = await db.$queryRawUnsafe(`
        SELECT id, code, title, difficulty
        FROM lessons
        WHERE code = ANY(ARRAY[${lesson.prerequisites.map(() => '?').join(',')}]) AND enabled = true
        ORDER BY difficulty, created_at
      `, ...lesson.prerequisites);
      
      relatedLessons.prerequisites = Array.isArray(prereqResult) ? prereqResult : [];
    }
    
    // Find lessons that have this lesson as a prerequisite (next steps)
    const nextStepsResult = await db.$queryRaw`
      SELECT id, code, title, difficulty
      FROM lessons
      WHERE ${lesson.code} = ANY(prerequisites) AND enabled = true
      ORDER BY difficulty, created_at
      LIMIT 5
    `;
    relatedLessons.nextSteps = Array.isArray(nextStepsResult) ? nextStepsResult : [];
    
    // Calculate completion statistics for this lesson
    const statsResult = await db.$queryRaw`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'not_started') as not_started,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'passed') as passed,
        AVG(completion_percentage) FILTER (WHERE status != 'not_started') as avg_completion,
        AVG(quiz_score) FILTER (WHERE quiz_score IS NOT NULL) as avg_quiz_score
      FROM user_progress
      WHERE lesson_id = ${lessonId}
    `;
    const stats = (Array.isArray(statsResult) && statsResult.length > 0) ? statsResult[0] : null;
    
    // Filter exercises based on user role and environment
    const userRole = request.headers.get('x-user-role') || 'viewer';
    const environment = process.env.NEXT_PUBLIC_ENV || 'production';
    
    const filteredExercises = exercises.filter(exercise => {
      // Check role requirement
      const roleOrder = { viewer: 1, analyst: 2, admin: 3 };
      const userRoleLevel = roleOrder[userRole as keyof typeof roleOrder] || 1;
      const requiredRoleLevel = roleOrder[exercise.required_role as keyof typeof roleOrder] || 1;
      
      if (userRoleLevel < requiredRoleLevel) {
        return false;
      }
      
      // Check environment restriction
      if (exercise.environment_restriction && exercise.environment_restriction !== environment) {
        return false;
      }
      
      return true;
    });
    
    const response = {
      lesson: {
        ...lesson,
        estimatedMinutes: lesson.est_minutes,
        contentMarkdown: lesson.content_md
      },
      quiz,
      checklist,
      exercises: filteredExercises,
      userProgress,
      relatedLessons,
      statistics: {
        engagement: {
          notStarted: parseInt(stats.not_started) || 0,
          inProgress: parseInt(stats.in_progress) || 0,
          completed: parseInt(stats.completed) || 0,
          passed: parseInt(stats.passed) || 0
        },
        performance: {
          averageCompletion: parseFloat(stats.avg_completion) || 0,
          averageQuizScore: parseFloat(stats.avg_quiz_score) || null
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        userId: userId !== 'anonymous' ? userId : undefined,
        userRole,
        environment
      }
    };
    
    // Update user progress to mark lesson as started if not already
    if (userId !== 'anonymous' && (!userProgress || userProgress.status === 'not_started')) {
      await db.$executeRaw`
        INSERT INTO user_progress (user_id, lesson_id, status, started_at, last_activity_at)
        VALUES (${userId}, ${lessonId}, 'in_progress', NOW(), NOW())
        ON CONFLICT (user_id, lesson_id)
        DO UPDATE SET 
          status = CASE WHEN user_progress.status = 'not_started' THEN 'in_progress' ELSE user_progress.status END,
          started_at = COALESCE(user_progress.started_at, NOW()),
          last_activity_at = NOW()
      `;
      
      // Update response with new status
      if (response.userProgress) {
        response.userProgress.status = 'in_progress';
        response.userProgress.started_at = new Date().toISOString();
        response.userProgress.last_activity_at = new Date().toISOString();
      }
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Academy lesson detail API error:', error);
    
    if (error instanceof z.ZodError) {
      status = 400;
      return NextResponse.json({
        error: 'Invalid lesson ID format',
        details: error.errors
      }, { status });
    }
    
    status = 500;
    return NextResponse.json({
      error: 'Failed to fetch lesson details',
      details: error.message
    }, { status });
    
  } finally {
    // Record API metrics
    incApiRequest('/api/learn/lesson/[id]', 'GET', status);
  }
}

// PUT /api/learn/lesson/[id] - Update lesson (admin only)
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const startTime = Date.now();
  let status = 200;
  
  try {
    // RBAC: Only admins can update lessons
    await requireRole('admin');
    
    const { id: lessonId } = await params;
    const body = await request.json();
    
    // Validate UUID format
    const uuidSchema = z.string().uuid();
    uuidSchema.parse(lessonId);
    
    // Update schema - all fields optional for partial updates
    const updateLessonSchema = z.object({
      title: z.string().min(5).max(255).optional(),
      summary: z.string().min(10).max(1000).optional(),
      difficulty: z.enum(['intro', 'core', 'advanced']).optional(),
      estMinutes: z.number().min(5).max(300).optional(),
      contentMd: z.string().min(50).optional(),
      kind: z.enum(['lesson', 'runbook', 'template']).optional(),
      tags: z.array(z.string()).optional(),
      prerequisites: z.array(z.string()).optional(),
      enabled: z.boolean().optional()
    });
    
    const updates = updateLessonSchema.parse(body);
    
    // Check if lesson exists
    const existingLesson = await db.$queryRaw`SELECT id FROM lessons WHERE id = ${lessonId}`;
    
    if (!Array.isArray(existingLesson) || existingLesson.length === 0) {
      return NextResponse.json({
        error: 'Lesson not found',
        lessonId
      }, { status: 404 });
    }
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: unknown[] = [];
    let paramIndex = 1;
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbField = key === 'estMinutes' ? 'est_minutes' : 
                       key === 'contentMd' ? 'content_md' : key;
        updateFields.push(`${dbField} = $${paramIndex++}`);
        updateValues.push(value);
      }
    });
    
    if (updateFields.length === 0) {
      return NextResponse.json({
        error: 'No valid fields to update'
      }, { status: 400 });
    }
    
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(lessonId);
    
    const updateQuery = `
      UPDATE lessons 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, code, title, updated_at
    `;
    
    const result = await db.$queryRawUnsafe(updateQuery, ...updateValues) as any[];
    const updatedLesson = result[0];
    
    return NextResponse.json({
      message: 'Lesson updated successfully',
      lesson: updatedLesson,
      updates: Object.keys(updates)
    });
    
  } catch (error) {
    console.error('Academy lesson update error:', error);
    status = error instanceof z.ZodError ? 400 : 500;
    
    return NextResponse.json({
      error: 'Failed to update lesson',
      details: error instanceof z.ZodError ? error.errors : error.message
    }, { status });
    
  } finally {
    incApiRequest('/api/learn/lesson/[id]', 'PUT', status);
  }
}