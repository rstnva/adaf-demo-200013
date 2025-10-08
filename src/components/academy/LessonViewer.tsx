'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  ArrowRight, 
  Clock,
  CheckCircle,
  PlayCircle,
  BookOpen,
  Target,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface LessonContent {
  type: 'text' | 'code' | 'image' | 'video' | 'callout';
  content: string;
  language?: string; // for code blocks
  variant?: 'info' | 'warning' | 'success' | 'error'; // for callouts
}

interface Lesson {
  id: string;
  code: string;
  title: string;
  description: string;
  content: LessonContent[];
  difficulty: 'intro' | 'core' | 'advanced';
  estimatedMinutes: number;
  module: string;
  tags: string[];
  prerequisites: string[];
  learningObjectives: string[];
}

interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  questions: {
    id: string;
    question: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer';
    options?: string[];
    correctAnswer: string | string[];
    explanation?: string;
    points: number;
  }[];
  passingScore: number;
}

interface Checklist {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  items: {
    id: string;
    title: string;
    description: string;
    isRequired: boolean;
    estimatedMinutes: number;
    verificationMethod?: 'self_check' | 'peer_review' | 'instructor_check';
  }[];
}

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

interface UserProgress {
  lessonId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'passed';
  completionPercentage: number;
  currentStep: number;
  quizScore: number | null;
  exerciseStatus: Record<string, 'not_started' | 'in_progress' | 'completed' | 'failed'>;
  checklistProgress: Record<string, boolean>;
}

interface LessonViewerProps {
  lesson: Lesson;
  quiz?: Quiz;
  checklist?: Checklist;
  exercises: Exercise[];
  userProgress: UserProgress;
  onUpdateProgress: (progress: Partial<UserProgress>) => Promise<void>;
  onComplete: () => void;
}

export function LessonViewer({ 
  lesson, 
  quiz, 
  checklist, 
  exercises, 
  userProgress, 
  onUpdateProgress, 
  onComplete 
}: LessonViewerProps) {
  const [currentStep, setCurrentStep] = useState(userProgress.currentStep || 0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    objectives: true,
    content: true
  });

  // Calculate total steps: lesson content + quiz + checklist + exercises
  const totalSteps = lesson.content.length + 
                    (quiz ? 1 : 0) + 
                    (checklist ? 1 : 0) + 
                    exercises.length;

  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  useEffect(() => {
    // Update progress when step changes
    onUpdateProgress({
      currentStep,
      completionPercentage: progress,
      status: progress === 100 ? 'completed' : 'in_progress'
    });
  }, [currentStep, progress, onUpdateProgress]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getCurrentStepContent = () => {
    let stepIndex = currentStep;

    // Lesson content steps
    if (stepIndex < lesson.content.length) {
      return { type: 'content', data: lesson.content[stepIndex] };
    }
    stepIndex -= lesson.content.length;

    // Quiz step
    if (quiz && stepIndex === 0) {
      return { type: 'quiz', data: quiz };
    }
    if (quiz) stepIndex -= 1;

    // Checklist step
    if (checklist && stepIndex === 0) {
      return { type: 'checklist', data: checklist };
    }
    if (checklist) stepIndex -= 1;

    // Exercise steps
    if (stepIndex < exercises.length) {
      return { type: 'exercise', data: exercises[stepIndex] };
    }

    return null;
  };

  const currentStepContent = getCurrentStepContent();

  const ContentRenderer = ({ content }: { content: LessonContent }) => {
    switch (content.type) {
      case 'text':
        return (
          <div className="prose max-w-none">
            {content.content.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-4">{paragraph}</p>
            ))}
          </div>
        );

      case 'code':
        return (
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <code className={`language-${content.language || 'text'}`}>
              {content.content}
            </code>
          </pre>
        );

      case 'callout':
        const calloutStyles = {
          info: 'bg-blue-50 border-blue-200 text-blue-800',
          warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          success: 'bg-green-50 border-green-200 text-green-800',
          error: 'bg-red-50 border-red-200 text-red-800'
        };
        
        return (
          <div className={`border-l-4 p-4 rounded ${calloutStyles[content.variant || 'info']}`}>
            <p>{content.content}</p>
          </div>
        );

      default:
        return <p>{content.content}</p>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="capitalize">
                  {lesson.difficulty}
                </Badge>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {lesson.estimatedMinutes} min
                </Badge>
                <Badge variant="outline">
                  {lesson.module}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{lesson.title}</CardTitle>
              <p className="text-gray-600 mt-2">{lesson.description}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Step {currentStep + 1} of {totalSteps}</span>
              <span>{totalSteps - currentStep - 1} steps remaining</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Learning Objectives */}
      <Card>
        <CardHeader>
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('objectives')}
          >
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Learning Objectives
            </CardTitle>
            {expandedSections.objectives ? <ChevronUp /> : <ChevronDown />}
          </div>
        </CardHeader>
        {expandedSections.objectives && (
          <CardContent>
            <ul className="space-y-2">
              {lesson.learningObjectives.map((objective, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>

      {/* Current Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {currentStepContent?.type === 'content' && 'Lesson Content'}
            {currentStepContent?.type === 'quiz' && 'Knowledge Check'}
            {currentStepContent?.type === 'checklist' && 'Practice Checklist'}
            {currentStepContent?.type === 'exercise' && 'Hands-on Exercise'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStepContent?.type === 'content' && (
            <ContentRenderer content={currentStepContent.data as LessonContent} />
          )}
          
          {currentStepContent?.type === 'quiz' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                <p className="font-medium">Quiz: {(currentStepContent.data as Quiz).title}</p>
              </div>
              <p className="text-gray-600">{(currentStepContent.data as Quiz).description}</p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  This quiz has {(currentStepContent.data as Quiz).questions.length} questions. 
                  You need {(currentStepContent.data as Quiz).passingScore}% to pass.
                </p>
              </div>
            </div>
          )}

          {currentStepContent?.type === 'checklist' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <p className="font-medium">Checklist: {(currentStepContent.data as Checklist).title}</p>
              </div>
              <p className="text-gray-600">{(currentStepContent.data as Checklist).description}</p>
              <div className="space-y-3">
                {(currentStepContent.data as Checklist).items.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <input 
                      type="checkbox" 
                      className="mt-1"
                      checked={userProgress.checklistProgress?.[item.id] || false}
                      onChange={(e) => {
                        onUpdateProgress({
                          checklistProgress: {
                            ...userProgress.checklistProgress,
                            [item.id]: e.target.checked
                          }
                        });
                      }}
                    />
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-gray-600">{item.description}</p>
                      {item.isRequired && (
                        <Badge variant="outline" className="text-xs mt-1">Required</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStepContent?.type === 'exercise' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-purple-500" />
                <p className="font-medium">Exercise: {(currentStepContent.data as Exercise).title}</p>
              </div>
              <p className="text-gray-600">{(currentStepContent.data as Exercise).description}</p>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-800">
                  This exercise will guide you through a real system action. 
                  Points: {(currentStepContent.data as Exercise).points}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="text-sm text-gray-500">
          Step {currentStep + 1} of {totalSteps}
        </div>

        <Button
          onClick={nextStep}
          className="flex items-center gap-2"
        >
          {currentStep === totalSteps - 1 ? 'Complete Lesson' : 'Next'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}