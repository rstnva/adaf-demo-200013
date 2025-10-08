'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Award, 
  Clock, 
  Target,
  CheckCircle,
  PlayCircle,
  Circle,
  BarChart3,
  Calendar,
  Trophy
} from 'lucide-react';

interface UserStats {
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  totalPoints: number;
  userLevel: number;
  averageQuizScore: number | null;
  completionRate: number;
}

interface Lesson {
  id: string;
  code: string;
  title: string;
  difficulty: 'intro' | 'core' | 'advanced';
  estimatedMinutes: number;
  progress: {
    status: 'not_started' | 'in_progress' | 'completed' | 'passed';
    completionPercentage: number;
    quizScore: number | null;
    totalPoints: number;
  };
}

interface ProgressBarProps {
  userStats: UserStats | null;
  lessons: Lesson[];
}

const levelThresholds = [0, 100, 300, 600, 1000, 1500];

export function ProgressBar({ userStats, lessons }: ProgressBarProps) {
  if (!userStats) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No progress data available</p>
        </CardContent>
      </Card>
    );
  }

  const currentLevel = userStats.userLevel;
  const currentPoints = userStats.totalPoints;
  const nextLevelThreshold = levelThresholds[currentLevel] || levelThresholds[levelThresholds.length - 1];
  const prevLevelThreshold = levelThresholds[currentLevel - 1] || 0;
  
  const progressToNextLevel = nextLevelThreshold > currentPoints ? 
    ((currentPoints - prevLevelThreshold) / (nextLevelThreshold - prevLevelThreshold)) * 100 : 100;

  const difficultyProgress = {
    intro: lessons.filter(l => l.difficulty === 'intro'),
    core: lessons.filter(l => l.difficulty === 'core'),
    advanced: lessons.filter(l => l.difficulty === 'advanced')
  };

  const getDifficultyStats = (difficulty: keyof typeof difficultyProgress) => {
    const lessonsInDifficulty = difficultyProgress[difficulty];
    const completed = lessonsInDifficulty.filter(l => l.progress.status === 'passed').length;
    const inProgress = lessonsInDifficulty.filter(l => l.progress.status === 'in_progress').length;
    const total = lessonsInDifficulty.length;
    
    return { completed, inProgress, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  const totalEstimatedTime = lessons.reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0);
  const completedTime = lessons
    .filter(l => l.progress.status === 'passed')
    .reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0);

  const recentActivity = lessons
    .filter(l => l.progress.status !== 'not_started')
    .sort((a, b) => b.progress.totalPoints - a.progress.totalPoints)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Level Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Level Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">Level {currentLevel}</h3>
              <p className="text-gray-600">{currentPoints} points earned</p>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {currentLevel < 5 ? `${nextLevelThreshold - currentPoints} to Level ${currentLevel + 1}` : 'Max Level'}
            </Badge>
          </div>
          
          {currentLevel < 5 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Level {currentLevel}</span>
                <span>Level {currentLevel + 1}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progressToNextLevel, 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {Math.round(userStats.completionRate)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Learning Time</p>
                <p className="text-3xl font-bold text-blue-600">
                  {Math.round(completedTime / 60)}h
                </p>
                <p className="text-xs text-gray-500">of {Math.round(totalEstimatedTime / 60)}h total</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Quiz Average</p>
                <p className="text-3xl font-bold text-purple-600">
                  {userStats.averageQuizScore ? `${Math.round(userStats.averageQuizScore)}%` : 'N/A'}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress by Difficulty */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Progress by Difficulty
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(difficultyProgress).map(([difficulty]) => {
            const stats = getDifficultyStats(difficulty as keyof typeof difficultyProgress);
            const colors = {
              intro: 'bg-green-500',
              core: 'bg-blue-500', 
              advanced: 'bg-purple-500'
            };
            
            return (
              <div key={difficulty} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium capitalize">{difficulty}</h4>
                    <Badge variant="outline" className="text-xs">
                      {stats.completed}/{stats.total} completed
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-600">{Math.round(stats.percentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${colors[difficulty as keyof typeof colors]}`}
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{stats.inProgress} in progress</span>
                  <span>{stats.total - stats.completed - stats.inProgress} not started</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map(lesson => {
                const StatusIcon = lesson.progress.status === 'passed' ? CheckCircle :
                                 lesson.progress.status === 'in_progress' ? PlayCircle : Circle;
                const statusColor = lesson.progress.status === 'passed' ? 'text-green-500' :
                                   lesson.progress.status === 'in_progress' ? 'text-blue-500' : 'text-gray-400';
                
                return (
                  <div key={lesson.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`h-5 w-5 ${statusColor}`} />
                      <div>
                        <h4 className="font-medium">{lesson.title}</h4>
                        <p className="text-sm text-gray-600 capitalize">{lesson.difficulty} • {lesson.estimatedMinutes} min</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {lesson.progress.totalPoints > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <Award className="h-3 w-3 mr-1" />
                          {lesson.progress.totalPoints}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs capitalize">
                        {lesson.progress.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No learning activity yet. Start your first lesson!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}