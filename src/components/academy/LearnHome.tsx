'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Clock, 
  BookOpen, 
  Award, 
  TrendingUp, 
  Filter,
  PlayCircle,
  CheckCircle,
  Circle,
  Star,
  Users
} from 'lucide-react';
import { LessonCard } from './LessonCard';
import { ProgressBar } from './ProgressBar';
import { BadgeWall } from './BadgeWall';

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

interface UserStats {
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  totalPoints: number;
  userLevel: number;
  averageQuizScore: number | null;
  completionRate: number;
}

interface Badge {
  code: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  awardedAt?: string;
}

const difficultyColors = {
  intro: 'bg-green-100 text-green-800',
  core: 'bg-blue-100 text-blue-800',
  advanced: 'bg-purple-100 text-purple-800'
};

const statusIcons = {
  not_started: Circle,
  in_progress: PlayCircle,
  completed: CheckCircle,
  passed: CheckCircle
};

export function LearnHome() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadAcademyData();
  }, []);

  const loadAcademyData = async () => {
    try {
      setLoading(true);
      
      // Load lessons
      const lessonsResponse = await fetch('/api/learn/lessons');
      if (!lessonsResponse.ok) {
        throw new Error('Failed to load lessons');
      }
      const lessonsData = await lessonsResponse.json();
      setLessons(lessonsData.lessons || []);
      
      // Load user progress
      const progressResponse = await fetch('/api/learn/progress');
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        setUserStats(progressData.summary);
        setBadges(progressData.badges || []);
      }
      
    } catch (err) {
      console.error('Academy data loading error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const filteredLessons = lessons.filter(lesson => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        lesson.title.toLowerCase().includes(query) ||
        lesson.summary.toLowerCase().includes(query) ||
        lesson.tags.some(tag => tag.toLowerCase().includes(query));
      
      if (!matchesSearch) return false;
    }
    
    // Difficulty filter
    if (difficultyFilter !== 'all' && lesson.difficulty !== difficultyFilter) {
      return false;
    }
    
    // Kind filter
    if (kindFilter !== 'all' && lesson.kind !== kindFilter) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== 'all' && lesson.progress.status !== statusFilter) {
      return false;
    }
    
    return true;
  });

  const groupedLessons = {
    intro: filteredLessons.filter(l => l.difficulty === 'intro'),
    core: filteredLessons.filter(l => l.difficulty === 'core'),
    advanced: filteredLessons.filter(l => l.difficulty === 'advanced')
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Academy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
          <h3 className="text-red-800 font-medium mb-2">Failed to Load Academy</h3>
          <p className="text-red-600 text-sm">{error}</p>
          <Button 
            onClick={loadAcademyData}
            variant="outline" 
            size="sm" 
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          ADAF Academy
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Master ADAF's quantitative investment platform through interactive lessons, 
          hands-on exercises, and comprehensive assessments.
        </p>
      </div>

      {/* User Progress Overview */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Level</p>
                  <p className="text-3xl font-bold text-blue-600">{userStats.userLevel}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Points</p>
                  <p className="text-3xl font-bold text-green-600">{userStats.totalPoints}</p>
                </div>
                <Award className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {userStats.completedLessons}/{userStats.totalLessons}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Quiz Score</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {userStats.averageQuizScore ? `${Math.round(userStats.averageQuizScore)}%` : 'N/A'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="lessons" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lessons" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Lessons
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="badges" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Badges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lessons" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Lessons
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search lessons..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="intro">Intro</SelectItem>
                    <SelectItem value="core">Core</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={kindFilter} onValueChange={setKindFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="lesson">Lessons</SelectItem>
                    <SelectItem value="runbook">Runbooks</SelectItem>
                    <SelectItem value="template">Templates</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="passed">Passed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Lessons by Difficulty */}
          {Object.entries(groupedLessons).map(([difficulty, lessons]) => (
            <div key={difficulty}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-2xl font-bold capitalize">{difficulty} Level</h2>
                <Badge className={difficultyColors[difficulty as keyof typeof difficultyColors]}>
                  {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              {lessons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {lessons.map(lesson => (
                    <LessonCard
                      key={lesson.id}
                      lesson={lesson}
                      onLessonUpdate={loadAcademyData}
                    />
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center border-dashed">
                  <p className="text-gray-500">No lessons found matching your filters.</p>
                </Card>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="progress">
          <ProgressBar userStats={userStats} lessons={lessons} />
        </TabsContent>

        <TabsContent value="badges">
          <BadgeWall userBadges={[]} availableBadges={[]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}