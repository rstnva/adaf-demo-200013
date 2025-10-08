'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  Info,
  Lightbulb,
  RotateCcw,
  ExternalLink
} from 'lucide-react';

interface Exercise {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  action: 'backtest' | 'promote' | 'report' | 'acknowledge_alert' | 'trigger_worker' | 'retention_job' | 'csp_enforce';
  actionParams: Record<string, unknown>;
  verificationMethod: 'api_response' | 'metric_check' | 'table_check' | 'file_hash';
  verificationConfig: Record<string, unknown>;
  points: number;
  hints: string[];
}

interface ExerciseAttempt {
  id: string;
  exerciseId: string;
  status: 'in_progress' | 'completed' | 'failed';
  result?: {
    success: boolean;
    message: string;
    data?: unknown;
    verificationResult?: {
      verified: boolean;
      details: string;
    };
  };
  startedAt: string;
  completedAt?: string;
  attempts: number;
}

interface ExerciseRunnerProps {
  exercise: Exercise;
  attempt?: ExerciseAttempt;
  onExecute: (exerciseId: string) => Promise<ExerciseAttempt>;
  onRetry?: () => void;
}

const actionLabels = {
  backtest: 'Run Backtest',
  promote: 'Promote Strategy',
  report: 'Generate Report',
  acknowledge_alert: 'Acknowledge Alert',
  trigger_worker: 'Trigger Worker Process',
  retention_job: 'Run Retention Job',
  csp_enforce: 'Enforce CSP Policy'
};

const actionIcons = {
  backtest: '📊',
  promote: '⬆️',
  report: '📋',
  acknowledge_alert: '🔔',
  trigger_worker: '⚙️',
  retention_job: '🗂️',
  csp_enforce: '🛡️'
};

const actionDescriptions = {
  backtest: 'Execute a strategy backtest with historical data to validate performance',
  promote: 'Promote a strategy from testing to production environment',
  report: 'Generate a comprehensive strategy or portfolio report',
  acknowledge_alert: 'Acknowledge and handle system alerts and notifications',
  trigger_worker: 'Start worker processes for data processing or maintenance',
  retention_job: 'Execute data retention and cleanup procedures',
  csp_enforce: 'Enforce Content Security Policy rules and configurations'
};

export function ExerciseRunner({ exercise, attempt, onExecute, onRetry }: ExerciseRunnerProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      await onExecute(exercise.id);
    } catch (error) {
      console.error('Exercise execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const getStatusIcon = () => {
    if (!attempt) return <PlayCircle className="h-6 w-6 text-blue-500" />;
    
    switch (attempt.status) {
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'in_progress':
        return <Clock className="h-6 w-6 text-yellow-500 animate-spin" />;
      default:
        return <PlayCircle className="h-6 w-6 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    if (!attempt) return 'text-blue-600';
    
    switch (attempt.status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'in_progress':
        return 'text-yellow-600';
      default:
        return 'text-blue-600';
    }
  };

  const getStatusText = () => {
    if (!attempt) return 'Ready to Execute';
    
    switch (attempt.status) {
      case 'completed':
        return 'Successfully Completed';
      case 'failed':
        return 'Execution Failed';
      case 'in_progress':
        return 'Executing...';
      default:
        return 'Ready to Execute';
    }
  };

  const nextHint = () => {
    setCurrentHint((prev) => Math.min(prev + 1, exercise.hints.length - 1));
  };

  const prevHint = () => {
    setCurrentHint((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="space-y-6">
      {/* Exercise Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{actionIcons[exercise.action]}</span>
                {exercise.title}
              </CardTitle>
              <p className="text-gray-600 mt-2">{exercise.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {exercise.action.replace('_', ' ')}
              </Badge>
              <Badge variant="outline">
                <Zap className="h-3 w-3 mr-1" />
                {exercise.points} pts
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <p className={`font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </p>
                {attempt && attempt.attempts > 1 && (
                  <p className="text-sm text-gray-500">
                    Attempt #{attempt.attempts}
                  </p>
                )}
              </div>
            </div>

            {attempt?.completedAt && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-xs text-gray-500">
                  {new Date(attempt.completedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            What You&apos;ll Do
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            {actionDescriptions[exercise.action]}
          </p>

          {/* Action Parameters */}
          {Object.keys(exercise.actionParams).length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Parameters:</h4>
              <div className="bg-gray-50 p-3 rounded-lg">
                <pre className="text-sm text-gray-700">
                  {JSON.stringify(exercise.actionParams, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Verification Method */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Verification Method:</h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {exercise.verificationMethod.replace('_', ' ')}
              </Badge>
              <span className="text-sm text-gray-600">
                Results will be automatically verified
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hints Section */}
      {exercise.hints.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Hints
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHints(!showHints)}
              >
                {showHints ? 'Hide Hints' : 'Show Hints'}
              </Button>
            </div>
          </CardHeader>
          {showHints && (
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertDescription>
                    {exercise.hints[currentHint]}
                  </AlertDescription>
                </Alert>

                {exercise.hints.length > 1 && (
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevHint}
                      disabled={currentHint === 0}
                    >
                      Previous Hint
                    </Button>
                    <span className="text-sm text-gray-500">
                      {currentHint + 1} of {exercise.hints.length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={nextHint}
                      disabled={currentHint === exercise.hints.length - 1}
                    >
                      Next Hint
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Execution Results */}
      {attempt?.result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {attempt.result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Execution Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert className={attempt.result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
                <AlertDescription className={attempt.result.success ? 'text-green-800' : 'text-red-800'}>
                  {attempt.result.message}
                </AlertDescription>
              </Alert>

              {/* Verification Results */}
              {attempt.result.verificationResult && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Verification:</h4>
                  <Alert className={attempt.result.verificationResult.verified ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
                    <AlertDescription className={attempt.result.verificationResult.verified ? 'text-green-800' : 'text-yellow-800'}>
                      {attempt.result.verificationResult.details}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Raw Response Data */}
              {attempt.result.data && (
                <details className="border-t pt-4">
                  <summary className="font-medium cursor-pointer mb-2">
                    View Raw Response Data
                  </summary>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <pre className="text-sm text-gray-700 overflow-x-auto">
                      {JSON.stringify(attempt.result.data, null, 2)}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-4">
            {!attempt || attempt.status === 'failed' ? (
              <Button
                onClick={handleExecute}
                disabled={isExecuting}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg"
              >
                {isExecuting ? (
                  <>
                    <Clock className="h-5 w-5 mr-2 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-5 w-5 mr-2" />
                    {actionLabels[exercise.action]}
                  </>
                )}
              </Button>
            ) : attempt.status === 'completed' && onRetry ? (
              <Button
                onClick={onRetry}
                variant="outline"
                className="px-8 py-3 text-lg"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Try Again
              </Button>
            ) : null}

            {attempt?.status === 'completed' && attempt.result?.success && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Exercise Completed Successfully!</span>
              </div>
            )}
          </div>

          {/* Warning for failed attempts */}
          {attempt?.status === 'failed' && (
            <Alert className="mt-4 border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-yellow-800">
                The exercise failed to complete successfully. Review the error details above and try again.
                You can use the hints if you need guidance.
              </AlertDescription>
            </Alert>
          )}

          {/* External Links */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600 mb-2">Related Documentation:</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-blue-600">
                <ExternalLink className="h-4 w-4 mr-1" />
                Strategy Guide
              </Button>
              <Button variant="ghost" size="sm" className="text-blue-600">
                <ExternalLink className="h-4 w-4 mr-1" />
                API Reference
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}