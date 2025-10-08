'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Quiz } from '@/components/academy/Quiz';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface QuizData {
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
  timeLimit?: number;
}

interface QuizAttempt {
  id: string;
  quizId: string;
  answers: Record<string, string>;
  score: number;
  passed: boolean;
  completedAt: string;
  timeSpent: number;
}

export default function QuizPage() {
  const params = useParams();
  const quizId = params.id as string;
  
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuizData = async () => {
      try {
        setLoading(true);
        setError(null);

        // In a real implementation, these would be API calls
        // For now, using mock data
        setQuiz({
          id: quizId,
          lessonId: 'lesson-1',
          title: 'Knowledge Assessment Quiz',
          description: 'Test your understanding of the key concepts covered in this lesson.',
          questions: [
            {
              id: 'q1',
              question: 'What is the primary purpose of backtesting in algorithmic trading?',
              type: 'multiple_choice',
              options: [
                'To predict future market movements with certainty',
                'To evaluate strategy performance using historical data',
                'To execute trades in real-time',
                'To monitor live trading positions'
              ],
              correctAnswer: 'To evaluate strategy performance using historical data',
              explanation: 'Backtesting helps evaluate how a trading strategy would have performed using historical data, allowing traders to assess potential risks and returns before deploying the strategy with real money.',
              points: 20
            },
            {
              id: 'q2',
              question: 'Risk management is optional in algorithmic trading strategies.',
              type: 'true_false',
              correctAnswer: 'false',
              explanation: 'Risk management is essential in algorithmic trading to protect capital and ensure sustainable long-term performance.',
              points: 15
            },
            {
              id: 'q3',
              question: 'List three key metrics used to evaluate trading strategy performance.',
              type: 'short_answer',
              correctAnswer: ['Sharpe ratio', 'Maximum drawdown', 'Win rate', 'Profit factor', 'Return'],
              explanation: 'Common performance metrics include Sharpe ratio (risk-adjusted returns), maximum drawdown (largest peak-to-trough decline), win rate (percentage of profitable trades), and profit factor (gross profit/gross loss).',
              points: 25
            }
          ],
          passingScore: 70,
          timeLimit: 30
        });

        setAttempts([]);
      } catch (err) {
        console.error('Error fetching quiz data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (quizId) {
      fetchQuizData();
    }
  }, [quizId]);

  const handleQuizSubmit = async (answers: Record<string, string>) => {
    try {
      const response = await fetch('/api/learn/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quiz?.id,
          lessonId: quiz?.lessonId,
          answers
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit quiz');
      }

      const attempt = await response.json();
      setAttempts(prev => [attempt, ...prev]);
      return attempt;
    } catch (error) {
      console.error('Quiz submission failed:', error);
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
              <h3 className="text-lg font-medium">Loading quiz...</h3>
              <p className="text-gray-600">Please wait while we prepare your assessment</p>
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
            <h3 className="text-lg font-medium">Error Loading Quiz</h3>
            <p className="text-gray-600">{error}</p>
            <Link href="/academy">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Academy
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="text-center">
            <p className="text-gray-600">Quiz not found</p>
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
          <Link href={`/academy/lesson/${quiz.lessonId}`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lesson
            </Button>
          </Link>
        </div>

        {/* Quiz Component */}
        <Quiz
          quiz={quiz}
          previousAttempts={attempts}
          onSubmit={handleQuizSubmit}
          onRetake={() => window.location.reload()}
        />
      </div>
    </div>
  );
}