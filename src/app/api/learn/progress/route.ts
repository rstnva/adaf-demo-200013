// ADAF Academy - Progress Tracking API
// POST /api/learn/progress - Update user progress for lessons

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth/rbac';
import { incApiRequest, incAcademyLessonsStarted, incAcademyLessonsCompleted } from '@/lib/metrics';

const progressUpdateSchema = z.object({
  lessonId: z.string().uuid(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'passed']).optional(),
  completionPercentage: z.number().min(0).max(100).optional(),
  checklistUpdates: z.record(z.object({
    completed: z.boolean(),
    proof: z.string().url().optional(),
    completedAt: z.string().datetime().optional()
  })).optional(),
  exerciseResult: z.object({
    exerciseId: z.string().uuid(),
    completed: z.boolean(),
    points: z.number().min(0),
    attempts: z.number().min(1).default(1),
    result: z.record(z.unknown()).optional()
  }).optional()
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let status = 200;
  
  try {
    // RBAC: All authenticated users can update their own progress
    await requireRole('viewer');
    
    const body = await request.json();
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({
        error: 'User ID required for progress tracking'
      }, { status: 401 });
    }
    
    const { lessonId, status: newStatus, completionPercentage, checklistUpdates, exerciseResult } = 
      progressUpdateSchema.parse(body);
    
    // Verify lesson exists and is enabled
    const lessonQuery = 'SELECT id, code, title FROM lessons WHERE id = $1 AND enabled = true';
    const lessonResult = await db.$queryRawUnsafe(lessonQuery, [lessonId]);
    
    if ((lessonResult as any[]).length === 0) {
      return NextResponse.json({
        error: 'Lesson not found or disabled',
        lessonId
      }, { status: 404 });
    }
    
    const lesson = lessonResult[0];
    
    // Get current progress
    const currentProgressQuery = `
      SELECT status, completion_percentage, checklist_state, exercise_results, total_points
      FROM user_progress
      WHERE user_id = $1 AND lesson_id = $2
    `;
    
    const currentProgressResult = await db.$queryRawUnsafe(currentProgressQuery, [userId, lessonId]);
    let currentProgress = currentProgressResult[0];
    
    // Initialize progress if doesn't exist
    if (!currentProgress) {
      const insertProgressQuery = `
        INSERT INTO user_progress (user_id, lesson_id, status, started_at, last_activity_at)
        VALUES ($1, $2, 'in_progress', NOW(), NOW())
        RETURNING status, completion_percentage, checklist_state, exercise_results, total_points
      `;
      
      const insertResult = await db.$queryRawUnsafe(insertProgressQuery, [userId, lessonId]);
      currentProgress = insertResult[0];
      
      // Increment lessons started metric
      incAcademyLessonsStarted();
    }
    
    // Prepare updates
    let updatedChecklistState = currentProgress.checklist_state || {};
    let updatedExerciseResults = currentProgress.exercise_results || {};
    let newTotalPoints = currentProgress.total_points || 0;
    let calculatedCompletionPercentage = currentProgress.completion_percentage || 0;
    
    // Apply checklist updates
    if (checklistUpdates) {
      Object.entries(checklistUpdates).forEach(([itemId, update]) => {
        updatedChecklistState[itemId] = {
          ...updatedChecklistState[itemId],
          ...update,
          completedAt: update.completed ? (update.completedAt || new Date().toISOString()) : null
        };
      });
      
      // Recalculate completion percentage based on checklist
      const checklistQuery = 'SELECT items FROM checklists WHERE lesson_id = $1';
      const checklistResult = await db.$queryRawUnsafe(checklistQuery, [lessonId]);
      
      if ((checklistResult as any[]).length > 0) {
        const checklistItems = checklistResult[0].items;
        const totalItems = checklistItems.length;
        const completedItems = Object.values(updatedChecklistState).filter(
          (item: any) => item.completed
        ).length;
        
        calculatedCompletionPercentage = Math.round((completedItems / totalItems) * 100);
      }
    }
    
    // Apply exercise result update
    if (exerciseResult) {
      const { exerciseId, completed, points, attempts, result } = exerciseResult;
      
      // Verify exercise belongs to this lesson
      const exerciseQuery = 'SELECT id, points FROM exercises WHERE id = $1 AND lesson_id = $2';
      const exerciseCheckResult = await db.$queryRawUnsafe(exerciseQuery, [exerciseId, lessonId]);
      
      if ((exerciseCheckResult as any[]).length === 0) {
        return NextResponse.json({
          error: 'Exercise not found for this lesson',
          exerciseId,
          lessonId
        }, { status: 404 });
      }
      
      const currentExerciseResult = updatedExerciseResults[exerciseId] || { 
        completed: false, 
        points: 0, 
        attempts: 0 
      };
      
      updatedExerciseResults[exerciseId] = {
        completed,
        points: completed ? points : currentExerciseResult.points,
        attempts: currentExerciseResult.attempts + attempts,
        lastAttempt: new Date().toISOString(),
        result: result || {}
      };
      
      // Update total points (only add points if newly completed)
      if (completed && !currentExerciseResult.completed) {
        newTotalPoints += points;
      }
    }
    
    // Use provided completion percentage or calculated one
    const finalCompletionPercentage = completionPercentage !== undefined ? 
      completionPercentage : calculatedCompletionPercentage;
    
    // Determine final status
    let finalStatus = newStatus || currentProgress.status;
    
    // Auto-advance status based on completion
    if (finalCompletionPercentage >= 100 && finalStatus === 'in_progress') {
      finalStatus = 'completed';
    }
    
    // Update progress in database
    const updateProgressQuery = `
      UPDATE user_progress
      SET 
        status = $3,
        completion_percentage = $4,
        checklist_state = $5,
        exercise_results = $6,
        total_points = $7,
        completed_at = CASE WHEN $3 IN ('completed', 'passed') AND completed_at IS NULL THEN NOW() ELSE completed_at END,
        last_activity_at = NOW(),
        updated_at = NOW()
      WHERE user_id = $1 AND lesson_id = $2
      RETURNING *
    `;
    
    const updateResult = await db.$queryRawUnsafe(updateProgressQuery, [
      userId,
      lessonId,
      finalStatus,
      finalCompletionPercentage,
      JSON.stringify(updatedChecklistState),
      JSON.stringify(updatedExerciseResults),
      newTotalPoints
    ]);
    
    const updatedProgress = updateResult[0];
    
    // Check for badge eligibility if lesson completed
    if (finalStatus === 'passed' && currentProgress.status !== 'passed') {
      incAcademyLessonsCompleted();
      
      // Trigger badge check (async, don't wait)
      db.$queryRawUnsafe('SELECT auto_award_badges($1)', userId).catch(console.error);
    }
    
    // Get updated user level
    const levelQuery = `
      SELECT 
        SUM(total_points) as total_points,
        calculate_user_level(SUM(total_points)) as user_level,
        COUNT(*) FILTER (WHERE status = 'passed') as completed_lessons
      FROM user_progress
      WHERE user_id = $1
    `;
    
    const levelResult = await db.$queryRawUnsafe(levelQuery, [userId]);
    const userStats = levelResult[0];
    
    const response = {
      message: 'Progress updated successfully',
      progress: {
        lessonId: updatedProgress.lesson_id,
        status: updatedProgress.status,
        completionPercentage: updatedProgress.completion_percentage,
        quizScore: updatedProgress.quiz_score,
        totalPoints: updatedProgress.total_points,
        checklistState: updatedProgress.checklist_state,
        exerciseResults: updatedProgress.exercise_results,
        lastActivityAt: updatedProgress.last_activity_at,
        completedAt: updatedProgress.completed_at
      },
      userStats: {
        totalPoints: parseInt(userStats.total_points) || 0,
        userLevel: parseInt(userStats.user_level) || 1,
        completedLessons: parseInt(userStats.completed_lessons) || 0
      },
      lesson: {
        id: lesson.id,
        code: lesson.code,
        title: lesson.title
      },
      meta: {
        timestamp: new Date().toISOString(),
        updatesApplied: {
          status: newStatus !== undefined,
          completionPercentage: completionPercentage !== undefined,
          checklist: checklistUpdates !== undefined,
          exercise: exerciseResult !== undefined
        }
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Academy progress update error:', error);
    status = error instanceof z.ZodError ? 400 : 500;
    
    return NextResponse.json({
      error: 'Failed to update progress',
      details: error instanceof z.ZodError ? error.errors : error.message
    }, { status });
    
  } finally {
    incApiRequest('/api/learn/progress', 'POST', status);
  }
}

// GET /api/learn/progress - Get user's overall progress
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let status = 200;
  
  try {
    await requireRole('viewer');
    
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({
        error: 'User ID required for progress retrieval'
      }, { status: 401 });
    }
    
    // Get user's progress across all lessons
    const progressQuery = `
      SELECT 
        up.lesson_id,
        up.status,
        up.completion_percentage,
        up.quiz_score,
        up.total_points,
        up.started_at,
        up.completed_at,
        up.last_activity_at,
        l.code,
        l.title,
        l.difficulty,
        l.est_minutes
      FROM user_progress up
      JOIN lessons l ON l.id = up.lesson_id
      WHERE up.user_id = $1 AND l.enabled = true
      ORDER BY l.difficulty, l.created_at
    `;
    
    const progressResult = await db.$queryRawUnsafe(progressQuery, [userId]);
    const progress = progressResult as any[];
    
    // Get user badges
    const badgesQuery = `
      SELECT 
        b.code,
        b.name,
        b.description,
        b.icon,
        b.badge_color,
        ub.awarded_at
      FROM user_badges ub
      JOIN badges b ON b.id = ub.badge_id
      WHERE ub.user_id = $1
      ORDER BY ub.awarded_at DESC
    `;
    
    const badgesResult = await db.$queryRawUnsafe(badgesQuery, [userId]);
    const badges = badgesResult as any[];
    
    // Calculate summary statistics
    const totalLessons = progress.length;
    const completedLessons = progress.filter(p => p.status === 'passed').length;
    const inProgressLessons = progress.filter(p => p.status === 'in_progress').length;
    const totalPoints = progress.reduce((sum, p) => sum + (p.total_points || 0), 0);
    const averageQuizScore = progress.filter(p => p.quiz_score !== null)
      .reduce((sum, p, _, arr) => sum + p.quiz_score / arr.length, 0) || null;
    
    const userLevel = totalPoints < 100 ? 1 :
                     totalPoints < 300 ? 2 :
                     totalPoints < 600 ? 3 :
                     totalPoints < 1000 ? 4 : 5;
    
    const response = {
      userId,
      summary: {
        totalLessons,
        completedLessons,
        inProgressLessons,
        totalPoints,
        userLevel,
        averageQuizScore,
        completionRate: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
      },
      progress: progress.map(p => ({
        lessonId: p.lesson_id,
        lessonCode: p.code,
        lessonTitle: p.title,
        difficulty: p.difficulty,
        estimatedMinutes: p.est_minutes,
        status: p.status,
        completionPercentage: p.completion_percentage,
        quizScore: p.quiz_score,
        totalPoints: p.total_points,
        startedAt: p.started_at,
        completedAt: p.completed_at,
        lastActivityAt: p.last_activity_at
      })),
      badges: badges.map(b => ({
        code: b.code,
        name: b.name,
        description: b.description,
        icon: b.icon,
        color: b.badge_color,
        awardedAt: b.awarded_at
      })),
      meta: {
        timestamp: new Date().toISOString()
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Academy progress retrieval error:', error);
    status = 500;
    
    return NextResponse.json({
      error: 'Failed to retrieve progress',
      details: error.message
    }, { status });
    
  } finally {
    incApiRequest('/api/learn/progress', 'GET', status);
  }
}