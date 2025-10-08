'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  AlertCircle,
  BookOpen,
  RotateCcw
} from 'lucide-react';

interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
}

interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  questions: QuizQuestion[];
  passingScore: number;
  timeLimit?: number; // in minutes
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

interface QuizProps {
  quiz: Quiz;
  previousAttempts: QuizAttempt[];
  onSubmit: (answers: Record<string, string>) => Promise<QuizAttempt>;
  onRetake?: () => void;
}

export function Quiz({ quiz, previousAttempts, onSubmit, onRetake }: QuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(quiz.timeLimit ? quiz.timeLimit * 60 : null);

  const hasPassedBefore = previousAttempts.some(a => a.passed);
  const canRetake = !hasPassedBefore || onRetake;

  // Time tracking effect
  useState(() => {
    if (timeRemaining !== null) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 0) {
            clearInterval(interval);
            if (!isSubmitted) {
              handleSubmit();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  });

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (isSubmitted) return;
    
    setIsLoading(true);
    setIsSubmitted(true);
    
    try {
      const result = await onSubmit(answers);
      setAttempt(result);
      setShowResults(true);
    } catch (error) {
      console.error('Quiz submission failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getQuestionScore = (question: QuizQuestion, userAnswer: string) => {
    if (question.type === 'short_answer') {
      // For short answers, we'll need server-side evaluation
      return { correct: false, points: 0 };
    }

    const correct = Array.isArray(question.correctAnswer) 
      ? question.correctAnswer.includes(userAnswer)
      : question.correctAnswer === userAnswer;
    
    return { correct, points: correct ? question.points : 0 };
  };

  const calculateScore = () => {
    if (!attempt) return { score: 0, maxScore: 0 };
    
    const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    return { score: attempt.score, maxScore };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Results View
  if (showResults && attempt) {
    const { score, maxScore } = calculateScore();
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const passed = percentage >= quiz.passingScore;

    return (
      <div className="space-y-6">
        {/* Results Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {passed ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
              Quiz Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className={`text-3xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                  {percentage}%
                </div>
                <div className="text-sm text-gray-600">Score</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{score}</div>
                <div className="text-sm text-gray-600">Points Earned</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{formatTime(attempt.timeSpent)}</div>
                <div className="text-sm text-gray-600">Time Spent</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-600">{previousAttempts.length + 1}</div>
                <div className="text-sm text-gray-600">Attempt</div>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg">
              {passed ? (
                <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    <span className="font-medium">Congratulations! You passed the quiz.</span>
                  </div>
                  <p className="text-sm mt-2">
                    You scored {percentage}% (required: {quiz.passingScore}%)
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">Quiz not passed</span>
                  </div>
                  <p className="text-sm mt-2">
                    You scored {percentage}% (required: {quiz.passingScore}%)
                  </p>
                </div>
              )}
            </div>

            {canRetake && !passed && (
              <div className="mt-4">
                <Button onClick={() => window.location.reload()} className="w-full">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake Quiz
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Review */}
        <Card>
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {quiz.questions.map((question, index) => {
                const userAnswer = answers[question.id];
                const result = getQuestionScore(question, userAnswer);
                
                return (
                  <div key={question.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium flex-1">
                        {index + 1}. {question.question}
                      </h4>
                      <div className="flex items-center gap-2">
                        {result.correct ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <Badge variant={result.correct ? "default" : "destructive"}>
                          {result.points}/{question.points} pts
                        </Badge>
                      </div>
                    </div>

                    {question.options && (
                      <div className="space-y-2 mb-3">
                        {question.options.map((option, optIndex) => {
                          const isUserAnswer = userAnswer === option;
                          const isCorrect = Array.isArray(question.correctAnswer) 
                            ? question.correctAnswer.includes(option)
                            : question.correctAnswer === option;
                          
                          return (
                            <div 
                              key={optIndex} 
                              className={`p-2 rounded border ${
                                isCorrect ? 'bg-green-50 border-green-200' :
                                isUserAnswer ? 'bg-red-50 border-red-200' : 'bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isCorrect && <CheckCircle className="h-4 w-4 text-green-500" />}
                                {isUserAnswer && !isCorrect && <XCircle className="h-4 w-4 text-red-500" />}
                                <span className={isUserAnswer ? 'font-medium' : ''}>{option}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {question.type === 'short_answer' && (
                      <div className="space-y-2 mb-3">
                        <p className="text-sm font-medium text-gray-700">Your Answer:</p>
                        <div className="p-2 bg-gray-50 rounded border">
                          {userAnswer || 'No answer provided'}
                        </div>
                      </div>
                    )}

                    {question.explanation && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-sm text-blue-800">
                          <strong>Explanation:</strong> {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz Taking View
  const question = quiz.questions[currentQuestion];
  const totalQuestions = quiz.questions.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;
  const allAnswered = quiz.questions.every(q => answers[q.id]);

  return (
    <div className="space-y-6">
      {/* Quiz Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              {quiz.title}
            </div>
            {timeRemaining !== null && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime(timeRemaining)}
              </Badge>
            )}
          </CardTitle>
          <p className="text-gray-600">{quiz.description}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>Question {currentQuestion + 1} of {totalQuestions}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Question */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Question {currentQuestion + 1}</span>
            <Badge variant="outline">{question.points} points</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-lg font-medium">{question.question}</p>

            {question.type === 'multiple_choice' && question.options && (
              <div className="space-y-2">
                {question.options.map((option, index) => (
                  <label key={index} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}

            {question.type === 'true_false' && (
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value="true"
                    checked={answers[question.id] === "true"}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span>True</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value="false"
                    checked={answers[question.id] === "false"}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span>False</span>
                </label>
              </div>
            )}

            {question.type === 'short_answer' && (
              <Textarea
                placeholder="Enter your answer here..."
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                className="min-h-[100px]"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
          disabled={currentQuestion === 0}
        >
          Previous
        </Button>

        <div className="flex gap-2">
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestion(index)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                index === currentQuestion 
                  ? 'bg-blue-500 text-white'
                  : answers[quiz.questions[index].id]
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-500 border border-gray-300'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {currentQuestion === totalQuestions - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentQuestion(Math.min(totalQuestions - 1, currentQuestion + 1))}
          >
            Next
          </Button>
        )}
      </div>

      {/* Warning for unanswered questions */}
      {!allAnswered && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800">
                You have unanswered questions. Please answer all questions before submitting.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}