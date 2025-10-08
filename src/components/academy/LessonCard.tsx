'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Clock, 
  PlayCircle, 
  CheckCircle, 
  Circle, 
  Award, 
  BookOpen,
  FileText,
  Clipboard,
  ExternalLink
} from 'lucide-react';

interface Lesson {
  id: string;
  code: string;
  title: string;
  summary: string;
  difficulty: 'intro' | 'core' | 'advanced';
  estimatedMinutes: number;
  kind: 'lesson' | 'runbook' | 'template';
  tags: string[];
  prerequisites: string[];
  progress: {
    status: 'not_started' | 'in_progress' | 'completed' | 'passed';
    completionPercentage: number;
    quizScore: number | null;
    totalPoints: number;
  };
}

interface LessonCardProps {
  lesson: Lesson;
  onLessonUpdate?: () => void;
}

const difficultyColors = {
  intro: 'bg-green-100 text-green-800 border-green-200',
  core: 'bg-blue-100 text-blue-800 border-blue-200',
  advanced: 'bg-purple-100 text-purple-800 border-purple-200'
};

const statusConfig = {
  not_started: {
    icon: Circle,
    color: 'text-gray-500',
    label: 'Not Started',
    bgColor: 'bg-gray-50'
  },
  in_progress: {
    icon: PlayCircle,
    color: 'text-blue-500',
    label: 'In Progress',
    bgColor: 'bg-blue-50'
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-500',
    label: 'Completed',
    bgColor: 'bg-green-50'
  },
  passed: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    label: 'Passed',
    bgColor: 'bg-emerald-50'
  }
};

const kindIcons = {
  lesson: BookOpen,
  runbook: FileText,
  template: Clipboard
};

export function LessonCard({ lesson, onLessonUpdate }: LessonCardProps) {
  const [isStarting, setIsStarting] = useState(false);
  
  const StatusIcon = statusConfig[lesson.progress.status].icon;
  const KindIcon = kindIcons[lesson.kind];
  
  const handleStartLesson = async () => {
    if (lesson.progress.status !== 'not_started') return;
    
    try {
      setIsStarting(true);
      
      const response = await fetch('/api/learn/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lessonId: lesson.id,
          status: 'in_progress'
        })
      });
      
      if (response.ok) {
        onLessonUpdate?.();
      } else {
        console.error('Failed to start lesson');
      }
    } catch (error) {
      console.error('Error starting lesson:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const getProgressColor = () => {
    if (lesson.progress.completionPercentage >= 100) return 'bg-green-500';
    if (lesson.progress.completionPercentage >= 75) return 'bg-blue-500';
    if (lesson.progress.completionPercentage >= 50) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  const canAccessLesson = () => {
    // Check if prerequisites are met (simplified - in real app would check actual progress)
    return lesson.prerequisites.length === 0 || lesson.progress.status !== 'not_started';
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow duration-200 ${statusConfig[lesson.progress.status].bgColor} border`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <KindIcon className="h-5 w-5 text-gray-600" />
            <Badge className={difficultyColors[lesson.difficulty]}>
              {lesson.difficulty}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <StatusIcon className={`h-5 w-5 ${statusConfig[lesson.progress.status].color}`} />
          </div>
        </div>
        
        <CardTitle className="text-lg font-semibold line-clamp-2">
          {lesson.title}
        </CardTitle>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {lesson.estimatedMinutes} min
          </div>
          {lesson.progress.totalPoints > 0 && (
            <div className="flex items-center gap-1">
              <Award className="h-4 w-4" />
              {lesson.progress.totalPoints} pts
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-700 line-clamp-3">
          {lesson.summary}
        </p>
        
        {/* Tags */}
        {lesson.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lesson.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {lesson.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{lesson.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}
        
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{Math.round(lesson.progress.completionPercentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${lesson.progress.completionPercentage}%` }}
            />
          </div>
        </div>
        
        {/* Quiz Score */}
        {lesson.progress.quizScore !== null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Quiz Score</span>
            <span className={`font-medium ${lesson.progress.quizScore >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
              {lesson.progress.quizScore}%
            </span>
          </div>
        )}
        
        {/* Prerequisites Warning */}
        {lesson.prerequisites.length > 0 && lesson.progress.status === 'not_started' && (
          <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
            Prerequisites: {lesson.prerequisites.join(', ')}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {lesson.progress.status === 'not_started' ? (
            <Button 
              onClick={handleStartLesson}
              disabled={!canAccessLesson() || isStarting}
              className="flex-1"
              size="sm"
            >
              {isStarting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                  Starting...
                </div>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-1" />
                  Start Lesson
                </>
              )}
            </Button>
          ) : (
            <Link href={`/academy/lesson/${lesson.id}`} className="flex-1">
              <Button variant="default" size="sm" className="w-full">
                {lesson.progress.status === 'passed' ? 'Review' : 'Continue'}
                <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          )}
          
          {lesson.kind === 'runbook' && (
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}