// ADAF Academy - Lessons API
// GET /api/learn/lessons - List all available lessons with filtering

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/database';
import { requireRole } from '@/lib/auth';
import { incApiRequest } from '@/lib/metrics';

// Query parameters validation schema
const lessonsQuerySchema = z.object({
  kind: z.enum(['lesson', 'runbook', 'template']).optional(),
  difficulty: z.enum(['intro', 'core', 'advanced']).optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  enabled: z.boolean().default(true),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let status = 200;
  
  try {
    // RBAC: Lessons are viewable by all authenticated users
    await requireRole('viewer');
    
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { kind, difficulty, tag, search, enabled, limit, offset } = lessonsQuerySchema.parse(searchParams);
    
    // Build dynamic WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;
    
    conditions.push(`enabled = $${paramIndex++}`);
    params.push(enabled);
    
    if (kind) {
      conditions.push(`kind = $${paramIndex++}`);
      params.push(kind);
    }
    
    if (difficulty) {
      conditions.push(`difficulty = $${paramIndex++}`);
      params.push(difficulty);
    }
    
    if (tag) {
      conditions.push(`$${paramIndex++} = ANY(tags)`);
      params.push(tag);
    }
    
    if (search) {
      conditions.push(`(title ILIKE $${paramIndex++} OR summary ILIKE $${paramIndex} OR array_to_string(tags, ' ') ILIKE $${paramIndex})`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      paramIndex += 3;
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Execute query for lessons list
    const lessonsQuery = `
      SELECT 
        id,
        code,
        title,
        summary,
        difficulty,
        est_minutes,
        kind,
        tags,
        prerequisites,
        created_at,
        updated_at
      FROM lessons
      ${whereClause}
      ORDER BY 
        CASE difficulty 
          WHEN 'intro' THEN 1 
          WHEN 'core' THEN 2 
          WHEN 'advanced' THEN 3 
        END,
        created_at ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    
    params.push(limit, offset);
    
    const lessonsResult = await db.$queryRawUnsafe(lessonsQuery, ...params) as any[];
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM lessons
      ${whereClause}
    `;
    
    const countResult = await db.$queryRawUnsafe(countQuery, ...params.slice(0, -2)) as any[]; // Remove limit/offset from count query
    const total = parseInt(countResult[0].total);
    
    // Get user progress for these lessons (if user is authenticated)
    const userId = request.headers.get('x-user-id') || 'anonymous';
    const lessonIds = lessonsResult.map(l => l.id);
    
    let progressMap = {};
    if (userId !== 'anonymous' && lessonIds.length > 0) {
      const progressQuery = `
        SELECT lesson_id, status, completion_percentage, quiz_score, total_points
        FROM user_progress 
        WHERE user_id = $1 AND lesson_id = ANY($2)
      `;
      
      const progressResult = await db.$queryRaw`
        SELECT lesson_id, status, completion_percentage, quiz_score, total_points
        FROM user_progress 
        WHERE user_id = ${userId} AND lesson_id = ANY(${lessonIds})
      ` as any[];
      progressMap = progressResult.reduce((acc, row) => {
        acc[row.lesson_id] = {
          status: row.status,
          completionPercentage: row.completion_percentage,
          quizScore: row.quiz_score,
          totalPoints: row.total_points
        };
        return acc;
      }, {});
    }
    
    // Enrich lessons with progress data
    const enrichedLessons = lessonsResult.map(lesson => ({
      ...lesson,
      progress: progressMap[lesson.id] || { 
        status: 'not_started', 
        completionPercentage: 0, 
        quizScore: null, 
        totalPoints: 0 
      }
    }));
    
    // Get summary statistics
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE difficulty = 'intro') as intro_count,
        COUNT(*) FILTER (WHERE difficulty = 'core') as core_count,
        COUNT(*) FILTER (WHERE difficulty = 'advanced') as advanced_count,
        COUNT(*) FILTER (WHERE kind = 'lesson') as lesson_count,
        COUNT(*) FILTER (WHERE kind = 'runbook') as runbook_count,
        COUNT(*) FILTER (WHERE kind = 'template') as template_count
      FROM lessons
      WHERE enabled = true
    `;
    
    const statsResult = await db.$queryRaw`
      SELECT 
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE difficulty = 'beginner') as beginner_count,
        COUNT(*) FILTER (WHERE difficulty = 'intermediate') as intermediate_count,
        COUNT(*) FILTER (WHERE difficulty = 'advanced') as advanced_count,
        COUNT(*) FILTER (WHERE kind = 'lesson') as lesson_count,
        COUNT(*) FILTER (WHERE kind = 'quiz') as quiz_count,
        COUNT(*) FILTER (WHERE kind = 'exercise') as exercise_count,
        COUNT(*) FILTER (WHERE kind = 'runbook') as runbook_count,
        COUNT(*) FILTER (WHERE kind = 'template') as template_count
      FROM lessons
      WHERE enabled = true
    ` as any[];
    const stats = statsResult[0];
    
    const response = {
      lessons: enrichedLessons,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      statistics: {
        byDifficulty: {
          intro: parseInt(stats.intro_count),
          core: parseInt(stats.core_count),
          advanced: parseInt(stats.advanced_count)
        },
        byKind: {
          lesson: parseInt(stats.lesson_count),
          runbook: parseInt(stats.runbook_count),
          template: parseInt(stats.template_count)
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        userId: userId !== 'anonymous' ? userId : undefined
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Academy lessons API error:', error);
    status = error instanceof z.ZodError ? 400 : 500;
    
    return NextResponse.json({
      error: 'Failed to fetch lessons',
      details: error instanceof z.ZodError ? error.errors : error.message
    }, { status });
    
  } finally {
    // Record API metrics
    incApiRequest('/api/learn/lessons', 'GET', status, Date.now() - startTime);
  }
}

// POST /api/learn/lessons - Create new lesson (admin only)
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let status = 201;
  
  try {
    // RBAC: Only admins can create lessons
    await requireRole('admin');
    
    const body = await request.json();
    
    // Validation schema for lesson creation
    const createLessonSchema = z.object({
      code: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
      title: z.string().min(5).max(255),
      summary: z.string().min(10).max(1000),
      difficulty: z.enum(['intro', 'core', 'advanced']),
      estMinutes: z.number().min(5).max(300),
      contentMd: z.string().min(50),
      kind: z.enum(['lesson', 'runbook', 'template']),
      tags: z.array(z.string()).default([]),
      prerequisites: z.array(z.string()).default([]),
      enabled: z.boolean().default(true)
    });
    
    const validatedData = createLessonSchema.parse(body);
    
    // Check if code is unique
    const existingLesson = await db.$queryRaw`SELECT id FROM lessons WHERE code = ${validatedData.code}` as any[];
    
    if (existingLesson.length > 0) {
      return NextResponse.json({
        error: 'Lesson code already exists',
        code: validatedData.code
      }, { status: 409 });
    }
    
    // Insert new lesson
    const insertQuery = `
      INSERT INTO lessons (
        code, title, summary, difficulty, est_minutes, 
        content_md, kind, tags, prerequisites, enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, code, title, created_at
    `;
    
    const result = await db.$queryRaw`
      INSERT INTO lessons (
        code, title, summary, difficulty, est_minutes, 
        content_md, kind, tags, prerequisites, enabled
      ) VALUES (${validatedData.code}, ${validatedData.title}, ${validatedData.summary}, ${validatedData.difficulty}, ${validatedData.estMinutes}, ${validatedData.contentMd}, ${validatedData.kind}, ${validatedData.tags}, ${validatedData.prerequisites}, ${validatedData.enabled})
      RETURNING id, code, title, created_at
    ` as any[];
    
    const newLesson = result[0];
    
    return NextResponse.json({
      message: 'Lesson created successfully',
      lesson: newLesson
    }, { status: 201 });
    
  } catch (error) {
    console.error('Academy lesson creation error:', error);
    status = error instanceof z.ZodError ? 400 : 500;
    
    return NextResponse.json({
      error: 'Failed to create lesson',
      details: error instanceof z.ZodError ? error.errors : error.message
    }, { status });
    
  } finally {
    incApiRequest('/api/learn/lessons', 'POST', status, Date.now() - startTime);
  }
}