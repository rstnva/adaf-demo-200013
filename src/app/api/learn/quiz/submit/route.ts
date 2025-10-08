// ADAF Academy - Quiz Submission API
// POST /api/learn/quiz/submit - Submit quiz answers and get results

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth/rbac';
import { incApiRequest, incAcademyQuizSubmissions } from '@/lib/metrics';

const quizSubmissionSchema = z.object({
  lessonId: z.string().uuid(),
  answers: z.array(z.number().int().min(0)),
  timeSpent: z.number().min(0).optional() // seconds spent on quiz
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let status = 200;
  
  try {
    // RBAC: All authenticated users can submit quizzes
    await requireRole('viewer');
    
    const body = await request.json();
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({
        error: 'User ID required for quiz submission'
      }, { status: 401 });
    }
    
    const { lessonId, answers, timeSpent } = quizSubmissionSchema.parse(body);
    
    // Get quiz for the lesson
    const quizQuery = `
      SELECT q.id, q.title, q.items, q.pass_percentage, q.time_limit_minutes,
             l.code as lesson_code, l.title as lesson_title
      FROM quizzes q
      JOIN lessons l ON l.id = q.lesson_id
      WHERE q.lesson_id = $1 AND l.enabled = true
    `;
    
    const quizResult = await db.$queryRawUnsafe(quizQuery, [lessonId]);
    
    if ((quizResult as any[]).length === 0) {
      return NextResponse.json({
        error: 'Quiz not found for this lesson',
        lessonId
      }, { status: 404 });
    }
    
    const quiz = quizResult[0];
    const quizItems = quiz.items;
    
    // Validate answers array length
    if (answers.length !== quizItems.length) {
      return NextResponse.json({
        error: 'Answer count mismatch',
        expected: quizItems.length,
        received: answers.length
      }, { status: 400 });
    }
    
    // Validate answer indices
    for (let i = 0; i < answers.length; i++) {
      const answerIndex = answers[i];
      const question = quizItems[i];
      
      if (answerIndex >= question.choices.length) {
        return NextResponse.json({
          error: `Invalid answer index for question ${i + 1}`,
          questionIndex: i,
          answerIndex,
          maxIndex: question.choices.length - 1
        }, { status: 400 });
      }
    }
    
    // Calculate score and generate feedback
    let correctAnswers = 0;
    const feedback = quizItems.map((question, index) => {
      const userAnswer = answers[index];
      const correctAnswer = question.answerIdx;
      const isCorrect = userAnswer === correctAnswer;
      
      if (isCorrect) {
        correctAnswers++;
      }
      
      return {
        questionIndex: index,
        question: question.question,
        userAnswer: userAnswer,
        correctAnswer: correctAnswer,
        isCorrect: isCorrect,
        userChoice: question.choices[userAnswer],
        correctChoice: question.choices[correctAnswer],
        explanation: question.explanation || null
      };
    });
    
    const scorePercentage = Math.round((correctAnswers / quizItems.length) * 100);
    const passed = scorePercentage >= quiz.pass_percentage;
    
    // Check time limit if specified
    let timeLimitExceeded = false;
    if (quiz.time_limit_minutes && timeSpent) {
      const timeLimitSeconds = quiz.time_limit_minutes * 60;
      timeLimitExceeded = timeSpent > timeLimitSeconds;
    }
    
    // Update user progress with quiz score
    const updateProgressQuery = `
      UPDATE user_progress
      SET 
        quiz_score = $3,
        status = CASE 
          WHEN $4 = true THEN 'passed'
          WHEN status = 'not_started' THEN 'in_progress'
          ELSE status
        END,
        last_activity_at = NOW(),
        updated_at = NOW()
      WHERE user_id = $1 AND lesson_id = $2
      RETURNING status, completion_percentage, total_points
    `;
    
    const updateResult = await db.$queryRawUnsafe(updateProgressQuery, [
      userId, 
      lessonId, 
      scorePercentage, 
      passed && !timeLimitExceeded
    ]);
    
    let updatedProgress = null;
    if ((updateResult as any[]).length > 0) {
      updatedProgress = updateResult[0];
    } else {
      // Create progress entry if doesn't exist
      const insertProgressQuery = `
        INSERT INTO user_progress (user_id, lesson_id, quiz_score, status, started_at, last_activity_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING status, completion_percentage, total_points
      `;
      
      const insertResult = await db.$queryRawUnsafe(insertProgressQuery, [
        userId, 
        lessonId, 
        scorePercentage, 
        passed && !timeLimitExceeded ? 'passed' : 'in_progress'
      ]);
      
      updatedProgress = insertResult[0];
    }
    
    // Record quiz submission metrics
    incAcademyQuizSubmissions();
    
    // If quiz passed, check for badge eligibility
    if (passed && !timeLimitExceeded) {
      // Trigger badge check (async, don't wait)
      db.$queryRawUnsafe('SELECT auto_award_badges($1)', userId).catch(console.error);
    }
    
    const response = {
      quizId: quiz.id,
      lessonId: lessonId,
      lessonCode: quiz.lesson_code,
      lessonTitle: quiz.lesson_title,
      result: {
        score: scorePercentage,
        correctAnswers: correctAnswers,
        totalQuestions: quizItems.length,
        passed: passed,
        passThreshold: quiz.pass_percentage,
        timeLimitExceeded: timeLimitExceeded
      },
      feedback: feedback,
      progress: {
        status: updatedProgress?.status,
        completionPercentage: updatedProgress?.completion_percentage,
        totalPoints: updatedProgress?.total_points
      },
      meta: {
        timestamp: new Date().toISOString(),
        timeSpent: timeSpent || null,
        timeLimit: quiz.time_limit_minutes ? quiz.time_limit_minutes * 60 : null
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Academy quiz submission error:', error);
    status = error instanceof z.ZodError ? 400 : 500;
    
    return NextResponse.json({
      error: 'Failed to submit quiz',
      details: error instanceof z.ZodError ? error.errors : error.message
    }, { status });
    
  } finally {
    incApiRequest('/api/learn/quiz/submit', 'POST', status);
  }
}

// GET /api/learn/quiz/[lessonId] - Get quiz questions (without answers)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  let status = 200;
  
  try {
    await requireRole('viewer');
    
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/');
    const lessonId = pathSegments[pathSegments.length - 1];
    
    // Validate UUID format
    const uuidSchema = z.string().uuid();
    uuidSchema.parse(lessonId);
    
    // Get quiz for the lesson (excluding correct answers)
    const quizQuery = `
      SELECT 
        q.id,
        q.title,
        q.description,
        q.pass_percentage,
        q.time_limit_minutes,
        l.code as lesson_code,
        l.title as lesson_title
      FROM quizzes q
      JOIN lessons l ON l.id = q.lesson_id
      WHERE q.lesson_id = $1 AND l.enabled = true
    `;
    
    const quizResult = await db.$queryRawUnsafe(quizQuery, [lessonId]);
    
    if ((quizResult as any[]).length === 0) {
      return NextResponse.json({
        error: 'Quiz not found for this lesson',
        lessonId
      }, { status: 404 });
    }
    
    const quiz = quizResult[0];
    
    // Get quiz items but remove correct answers and explanations
    const itemsQuery = 'SELECT items FROM quizzes WHERE id = $1';
    const itemsResult = await db.$queryRawUnsafe(itemsQuery, [quiz.id]);
    const fullItems = itemsResult[0].items;
    
    // Strip sensitive information from questions
    const sanitizedItems = fullItems.map((item, index) => ({
      index: index,
      question: item.question,
      choices: item.choices
      // Deliberately omit answerIdx and explanation
    }));
    
    // Get user's previous attempts
    const userId = request.headers.get('x-user-id');
    let previousAttempts = null;
    
    if (userId) {
      const attemptsQuery = `
        SELECT quiz_score, last_activity_at
        FROM user_progress
        WHERE user_id = $1 AND lesson_id = $2 AND quiz_score IS NOT NULL
        ORDER BY last_activity_at DESC
        LIMIT 5
      `;
      
      const attemptsResult = await db.$queryRawUnsafe(attemptsQuery, [userId, lessonId]);
      previousAttempts = (attemptsResult as any[]).map(row => ({
        score: row.quiz_score,
        attemptedAt: row.last_activity_at
      }));
    }
    
    const response = {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        passPercentage: quiz.pass_percentage,
        timeLimitMinutes: quiz.time_limit_minutes,
        totalQuestions: sanitizedItems.length
      },
      lesson: {
        id: lessonId,
        code: quiz.lesson_code,
        title: quiz.lesson_title
      },
      questions: sanitizedItems,
      previousAttempts: previousAttempts,
      meta: {
        timestamp: new Date().toISOString(),
        userId: userId || null
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Academy quiz retrieval error:', error);
    status = error instanceof z.ZodError ? 400 : 500;
    
    return NextResponse.json({
      error: 'Failed to retrieve quiz',
      details: error instanceof z.ZodError ? error.errors : error.message
    }, { status });
    
  } finally {
    incApiRequest('/api/learn/quiz/[lessonId]', 'GET', status);
  }
}