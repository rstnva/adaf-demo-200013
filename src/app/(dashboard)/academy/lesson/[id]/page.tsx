'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LessonViewer } from '@/components/academy/LessonViewer';
import { Quiz } from '@/components/academy/Quiz';
import { Checklist } from '@/components/academy/Checklist';
import { ExerciseRunner } from '@/components/academy/ExerciseRunner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Lesson {
  id: string;
  code: string;
  title: string;
  description: string;
  content: {
    type: 'text' | 'code' | 'image' | 'video' | 'callout';
    content: string;
    language?: string;
    variant?: 'info' | 'warning' | 'success' | 'error';
  }[];
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

interface ChecklistType {
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

export default function LessonPage() {
  const params = useParams();
  const lessonId = params.id as string;
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [checklist, setChecklist] = useState<ChecklistType | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lessonId) {
      fetchLessonData();
    }
  }, [lessonId]);

  const fetchLessonData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch lesson details
      const lessonResponse = await fetch(`/api/learn/lesson/${lessonId}`);
      if (!lessonResponse.ok) {
        throw new Error('Failed to fetch lesson');
      }
      const lessonData = await lessonResponse.json();
      setLesson(lessonData);

      // Fetch user progress
      const progressResponse = await fetch(`/api/learn/progress?lessonId=${lessonId}`);
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        setUserProgress(progressData);
      } else {
        // Initialize progress if none exists
        setUserProgress({
          lessonId,
          status: 'not_started',
          completionPercentage: 0,
          currentStep: 0,
          quizScore: null,
          exerciseStatus: {},
          checklistProgress: {}
        });
      }

      // Set mock quiz, checklist, and exercises for now
      // In a real implementation, these would be fetched from the API
      setQuiz({
        id: 'quiz-1',
        lessonId,
        title: 'Knowledge Check',
        description: 'Test your understanding of the lesson content',
        questions: [
          {
            id: 'q1',
            question: 'What is the primary purpose of this lesson?',
            type: 'multiple_choice',
            options: ['Learning', 'Testing', 'Practice', 'All of the above'],
            correctAnswer: 'All of the above',
            explanation: 'This lesson covers learning, testing, and practice components.',
            points: 10
          }
        ],
        passingScore: 70
      });

      setChecklist({
        id: 'checklist-1',
        lessonId,
        title: 'Practice Checklist',
        description: 'Complete these items to practice what you learned',
        items: [
          {
            id: 'item1',
            title: 'Review lesson content',
            description: 'Go through all the lesson materials thoroughly',
            isRequired: true,
            estimatedMinutes: 10,
            verificationMethod: 'self_check'
          },
          {
            id: 'item2',
            title: 'Take notes',
            description: 'Write down key concepts and takeaways',
            isRequired: false,
            estimatedMinutes: 5,
            verificationMethod: 'self_check'
          }
        ]
      });

      setExercises([
        {
          id: 'exercise-1',
          lessonId,
          title: 'Practical Exercise',
          description: 'Apply what you learned in a real scenario',
          action: 'backtest',
          actionParams: { strategy: 'example' },
          verificationMethod: 'api_response',
          verificationConfig: { expectedStatus: 'success' },
          points: 50,
          hints: ['Start with the basic configuration', 'Check the parameters carefully']
        }
      ]);

    } catch (err) {
      console.error('Error fetching lesson data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async (progress: Partial<UserProgress>) => {
    if (!userProgress) return;

    const updatedProgress = { ...userProgress, ...progress };
    setUserProgress(updatedProgress);

    try {
      await fetch('/api/learn/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProgress)
      });
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const handleLessonComplete = () => {
    // Navigate back to academy with success message
    window.location.href = '/academy?completed=' + lessonId;
  };

  const handleQuizSubmit = async (answers: Record<string, string>) => {
    try {
      const response = await fetch('/api/learn/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quiz?.id,
          lessonId,
          answers
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit quiz');
      }

      return await response.json();
    } catch (error) {
      console.error('Quiz submission failed:', error);
      throw error;
    }
  };

  const handleExerciseExecute = async (exerciseId: string) => {
    try {
      const response = await fetch('/api/learn/exercise/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId, lessonId })
      });

      if (!response.ok) {
        throw new Error('Failed to execute exercise');
      }

      return await response.json();
    } catch (error) {
      console.error('Exercise execution failed:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="flex items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <div>
              <h3 className="text-lg font-medium">Loading lesson...</h3>
              <p className="text-gray-600">Please wait while we prepare your content</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <CardContent className="text-center space-y-4">
            <div className="text-red-500 text-5xl">⚠️</div>
            <h3 className="text-lg font-medium">Error Loading Lesson</h3>
            <p className="text-gray-600">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={fetchLessonData}>Try Again</Button>
              <Link href="/academy">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Academy
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!lesson || !userProgress) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="text-center">
            <p className="text-gray-600">Lesson not found</p>
            <Link href="/academy">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Academy
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link href="/academy">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Academy
            </Button>
          </Link>
        </div>

        {/* Lesson Content */}
        <LessonViewer
          lesson={lesson}
          quiz={quiz || undefined}
          checklist={checklist || undefined}
          exercises={exercises}
          userProgress={userProgress}
          onUpdateProgress={handleUpdateProgress}
          onComplete={handleLessonComplete}
        />
      </div>
    </div>
  );
}