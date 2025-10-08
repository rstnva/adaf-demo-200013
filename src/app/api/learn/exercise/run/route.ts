// ADAF Academy - Exercise Execution API
// POST /api/learn/exercise/run - Execute practical exercises with real system integration

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth/rbac';
import { incApiRequest, incAcademyExercisesRun } from '@/lib/metrics';

const exerciseRunSchema = z.object({
  exerciseId: z.string().uuid(),
  parameters: z.record(z.unknown()).optional() // Additional parameters for the exercise
});

// Exercise action handlers
class ExerciseHandler {
  private userId: string;
  private baseUrl: string;
  
  constructor(userId: string, baseUrl: string) {
    this.userId = userId;
    this.baseUrl = baseUrl;
  }
  
  async runBacktest(params: any): Promise<{ success: boolean; result: any; verification?: any }> {
    try {
      // Call the existing backtest API
      const response = await fetch(`${this.baseUrl}/api/research/backtest/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId
        },
        body: JSON.stringify({
          preset: params.preset || 'etf-momentum-basic',
          startDate: params.startDate || '2023-01-01',
          endDate: params.endDate || '2023-12-31',
          source: 'academy-exercise'
        })
      });
      
      const result = await response.json();
      
      return {
        success: response.ok,
        result: result,
        verification: {
          backtestId: result.backtestId,
          status: result.status,
          metrics: result.performance
        }
      };
    } catch (error) {
      return {
        success: false,
        result: { error: error.message }
      };
    }
  }
  
  async promoteOpx(params: any): Promise<{ success: boolean; result: any; verification?: any }> {
    try {
      // Find a suitable backtest to promote or use specified one
      let backtestId = params.backtest_id;
      
      if (backtestId === 'auto-select') {
        // Find recent successful backtest meeting criteria
        const backtestQuery = `
          SELECT id, performance_metrics 
          FROM backtests 
          WHERE status = 'completed' 
          AND user_id = $1 
          AND created_at > NOW() - INTERVAL '7 days'
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        
        const backtestResult = await db.$queryRaw`
          SELECT 
            id, 
            asset_class,
            strategy_name, 
            backtest_config,
            performance_summary,
            created_at
          FROM backtests 
          WHERE status = 'completed' 
          AND user_id = ${this.userId}
          AND created_at > NOW() - INTERVAL '7 days'
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        
        if (!Array.isArray(backtestResult) || backtestResult.length === 0) {
          return {
            success: false,
            result: { error: 'No suitable backtest found for promotion' }
          };
        }

        backtestId = (backtestResult[0] as any).id;
      }
      
      // Call the promotion API
      const response = await fetch(`${this.baseUrl}/api/research/backtest/promote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId
        },
        body: JSON.stringify({
          backtestId: backtestId,
          source: 'academy-exercise'
        })
      });
      
      const result = await response.json();
      
      return {
        success: response.ok,
        result: result,
        verification: {
          strategyId: result.strategyId,
          status: result.status
        }
      };
    } catch (error) {
      return {
        success: false,
        result: { error: error.message }
      };
    }
  }
  
  async generateReport(params: any): Promise<{ success: boolean; result: any; verification?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate/report/onepager`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId
        },
        body: JSON.stringify({
          template: params.template || 'one-pager',
          portfolio: params.portfolio || 'flagship',
          period: params.period || 'monthly',
          source: 'academy-exercise'
        })
      });
      
      const result = await response.json();
      
      return {
        success: response.ok,
        result: result,
        verification: {
          reportId: result.reportId,
          fileHash: result.fileHash,
          downloadUrl: result.downloadUrl
        }
      };
    } catch (error) {
      return {
        success: false,
        result: { error: error.message }
      };
    }
  }
  
  async triggerWorker(params: any): Promise<{ success: boolean; result: any; verification?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/agents/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId
        },
        body: JSON.stringify({
          workerType: params.workerType || 'kpi-calculation',
          priority: params.priority || 'normal',
          source: 'academy-exercise'
        })
      });
      
      const result = await response.json();
      
      return {
        success: response.ok,
        result: result,
        verification: {
          jobId: result.jobId,
          status: result.status
        }
      };
    } catch (error) {
      return {
        success: false,
        result: { error: error.message }
      };
    }
  }
  
  async ackAlert(params: any): Promise<{ success: boolean; result: any; verification?: any }> {
    try {
      // Find recent alerts to acknowledge
      const response = await fetch(`${this.baseUrl}/api/read/alerts/ack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId
        },
        body: JSON.stringify({
          severity: params.severity || 'WARNING',
          category: params.category || 'guardrails',
          source: 'academy-exercise'
        })
      });
      
      const result = await response.json();
      
      return {
        success: response.ok,
        result: result,
        verification: {
          acknowledgedCount: result.acknowledgedCount || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        result: { error: error.message }
      };
    }
  }
  
  async retentionJob(params: any): Promise<{ success: boolean; result: any; verification?: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ops/retention/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.userId
        },
        body: JSON.stringify({
          categories: params.categories || ['logs', 'temp_data'],
          dry_run: params.dry_run !== false, // Default to dry run for safety
          source: 'academy-exercise'
        })
      });
      
      const result = await response.json();
      
      return {
        success: response.ok,
        result: result,
        verification: {
          processedRecords: result.processedRecords || 0,
          deletedRecords: result.deletedRecords || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        result: { error: error.message }
      };
    }
  }
  
  async cspEnforce(params: any): Promise<{ success: boolean; result: any; verification?: any }> {
    try {
      // This is a sensitive operation, only allow in staging
      const environment = process.env.NEXT_PUBLIC_ENV || 'production';
      
      if (environment !== 'staging') {
        return {
          success: false,
          result: { error: 'CSP enforcement changes only allowed in staging environment' }
        };
      }
      
      // Simulate CSP policy change (in real implementation, this would update security headers)
      const result = {
        mode: params.mode || 'report-only',
        duration: params.duration || 600,
        previousMode: 'enforcement',
        timestamp: new Date().toISOString()
      };
      
      return {
        success: true,
        result: result,
        verification: {
          policyMode: result.mode,
          duration: result.duration
        }
      };
    } catch (error) {
      return {
        success: false,
        result: { error: error.message }
      };
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let status = 200;
  
  try {
    // RBAC: Exercise execution requires at least viewer role (individual exercises may require higher)
    await requireRole('viewer');
    
    const body = await request.json();
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({
        error: 'User ID required for exercise execution'
      }, { status: 401 });
    }
    
    const { exerciseId, parameters } = exerciseRunSchema.parse(body);
    
    // Get exercise details
    const exerciseResult = await db.$queryRaw`
      SELECT 
        e.id, e.title, e.description, e.action, e.action_params,
        e.verify_method, e.verify_params, e.points, e.required_role,
        e.environment_restriction, e.lesson_id,
        l.code as lesson_code, l.title as lesson_title
      FROM exercises e
      JOIN lessons l ON l.id = e.lesson_id
      WHERE e.id = ${exerciseId} AND l.enabled = true
    `;
    
    if (!Array.isArray(exerciseResult) || exerciseResult.length === 0) {
      return NextResponse.json({
        error: 'Exercise not found or lesson disabled',
        exerciseId
      }, { status: 404 });
    }
    
    const exercise = exerciseResult[0] as any;
    
    // Check role requirements
    const userRole = request.headers.get('x-user-role') || 'viewer';
    const roleOrder = { viewer: 1, analyst: 2, admin: 3 };
    const userRoleLevel = roleOrder[userRole as keyof typeof roleOrder] || 1;
    const requiredRoleLevel = roleOrder[exercise.required_role as keyof typeof roleOrder] || 1;
    
    if (userRoleLevel < requiredRoleLevel) {
      return NextResponse.json({
        error: 'Insufficient permissions for this exercise',
        required: exercise.required_role,
        current: userRole
      }, { status: 403 });
    }
    
    // Check environment restrictions
    const environment = process.env.NEXT_PUBLIC_ENV || 'production';
    if (exercise.environment_restriction && exercise.environment_restriction !== environment) {
      return NextResponse.json({
        error: 'Exercise not available in current environment',
        required: exercise.environment_restriction,
        current: environment
      }, { status: 403 });
    }
    
    // Execute the exercise action
    const handler = new ExerciseHandler(userId, request.nextUrl.origin);
    const actionParams = { ...exercise.action_params, ...parameters };
    
    let executionResult;
    
    switch (exercise.action) {
      case 'runBacktest':
        executionResult = await handler.runBacktest(actionParams);
        break;
      case 'promoteOpx':
        executionResult = await handler.promoteOpx(actionParams);
        break;
      case 'generateReport':
        executionResult = await handler.generateReport(actionParams);
        break;
      case 'triggerWorker':
        executionResult = await handler.triggerWorker(actionParams);
        break;
      case 'ackAlert':
        executionResult = await handler.ackAlert(actionParams);
        break;
      case 'retentionJob':
        executionResult = await handler.retentionJob(actionParams);
        break;
      case 'cspEnforce':
        executionResult = await handler.cspEnforce(actionParams);
        break;
      default:
        return NextResponse.json({
          error: 'Unknown exercise action',
          action: exercise.action
        }, { status: 400 });
    }
    
    // Verify exercise completion based on verify_method
    let verificationResult = { passed: false, details: {} };
    
    if (executionResult.success) {
      verificationResult = await verifyExerciseCompletion(
        exercise.verify_method, 
        exercise.verify_params, 
        executionResult.verification
      );
    }
    
    const pointsAwarded = verificationResult.passed ? exercise.points : 0;
    
    // Update user progress with exercise result
    await updateExerciseProgress(
      userId, 
      exercise.lesson_id, 
      exerciseId, 
      verificationResult.passed,
      pointsAwarded,
      executionResult
    );
    
    // Record metrics
    incAcademyExercisesRun();
    
    const response = {
      exercise: {
        id: exercise.id,
        title: exercise.title,
        action: exercise.action,
        points: exercise.points
      },
      lesson: {
        id: exercise.lesson_id,
        code: exercise.lesson_code,
        title: exercise.lesson_title
      },
      execution: {
        success: executionResult.success,
        result: executionResult.result,
        verification: verificationResult
      },
      progress: {
        pointsAwarded: pointsAwarded,
        passed: verificationResult.passed
      },
      meta: {
        timestamp: new Date().toISOString(),
        environment: environment,
        userRole: userRole
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Academy exercise execution error:', error);
    status = error instanceof z.ZodError ? 400 : 500;
    
    return NextResponse.json({
      error: 'Failed to execute exercise',
      details: error instanceof z.ZodError ? error.errors : error.message
    }, { status });
    
  } finally {
    incApiRequest('/api/learn/exercise/run', 'POST', status);
  }
}

// Helper function for verification
async function verifyExerciseCompletion(
  method: string, 
  params: any, 
  executionData: any
): Promise<{ passed: boolean; details: any }> {
    
    switch (method) {
      case 'api':
        // Verify by calling an API endpoint
        try {
          const response = await fetch(`${params.endpoint}`, {
            method: params.method || 'GET'
          });
          
          if (response.ok) {
            const data = await response.json();
            const fieldValue = data[params.expected_field];
            
            if (params.min_value !== undefined) {
              return {
                passed: fieldValue >= params.min_value,
                details: { actualValue: fieldValue, expectedMin: params.min_value }
              };
            }
            
            return { passed: true, details: { response: data } };
          }
          
          return { passed: false, details: { error: 'API call failed', status: response.status } };
        } catch (error) {
          return { passed: false, details: { error: error.message } };
        }
        
      case 'metric':
        // Verify by checking metrics increase
        try {
          const metricsResponse = await fetch('/api/metrics');
          const metricsText = await metricsResponse.text();
          
          // Parse metrics for the specified metric
          const metricPattern = new RegExp(`${params.metric}(?:\\{[^}]*\\})? (\\d+)`);
          const match = metricsText.match(metricPattern);
          
          if (match) {
            const currentValue = parseInt(match[1]);
            return {
              passed: currentValue >= (params.min_increase || 1),
              details: { metricValue: currentValue }
            };
          }
          
          return { passed: false, details: { error: 'Metric not found' } };
        } catch (error) {
          return { passed: false, details: { error: error.message } };
        }
        
      case 'table':
        // Verify by checking database table
        try {
          const result = await db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${params.table} WHERE ${params.condition}`) as any[];
          const count = parseInt((result[0] as any).count);
          
          return {
            passed: count >= (params.min_count || 1),
            details: { recordCount: count }
          };
        } catch (error) {
          return { passed: false, details: { error: error.message } };
        }
        
      case 'fileHash':
        // Verify by checking file hash in execution data
        if (executionData && executionData.fileHash) {
          const hashMatches = params.expected_hash_pattern ? 
            new RegExp(params.expected_hash_pattern).test(executionData.fileHash) : true;
            
          return {
            passed: hashMatches,
            details: { fileHash: executionData.fileHash }
          };
        }
        
        return { passed: false, details: { error: 'No file hash in execution result' } };
        
      default:
        return { passed: false, details: { error: 'Unknown verification method' } };
    }
  }

// Helper function to update exercise progress
async function updateExerciseProgress(
  userId: string,
  lessonId: string,
  exerciseId: string,
  completed: boolean,
  points: number,
  executionResult: any
): Promise<void> {
    
    const exerciseResultData = {
      completed: completed,
      points: points,
      attempts: 1, // TODO: Increment existing attempts
      lastAttempt: new Date().toISOString(),
      result: executionResult
    };
    
    await db.$executeRaw`
      INSERT INTO user_progress (user_id, lesson_id, status, started_at, last_activity_at)
      VALUES (${userId}, ${lessonId}, 'in_progress', NOW(), NOW())
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET
        exercise_results = jsonb_set(
          COALESCE(user_progress.exercise_results, '{}'::jsonb),
          ${[exerciseId]}::text[],
          ${JSON.stringify(exerciseResultData)}::jsonb,
          true
        ),
        total_points = user_progress.total_points + ${completed ? points : 0},
        last_activity_at = NOW(),
        updated_at = NOW()
    `;
  }