'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Award,
  Trophy,
  Star,
  Target,
  Zap,
  Users,
  BookOpen,
  Clock,
  TrendingUp,
  Shield,
  Crown,
  Flame,
  Lock
} from 'lucide-react';

export interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'completion' | 'performance' | 'streak' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  criteria: {
    type: 'lessons_completed' | 'quiz_score' | 'streak_days' | 'points_earned' | 'special_action';
    threshold?: number;
    details?: string;
  };
  unlockedAt?: string;
  isUnlocked: boolean;
}

interface UserBadge {
  id: string;
  badgeId: string;
  unlockedAt: string;
  badge: BadgeData;
}

interface BadgeWallProps {
  userBadges: UserBadge[];
  availableBadges: BadgeData[];
}

const iconMap = {
  award: Award,
  trophy: Trophy,
  star: Star,
  target: Target,
  zap: Zap,
  users: Users,
  book: BookOpen,
  clock: Clock,
  trending: TrendingUp,
  shield: Shield,
  crown: Crown,
  flame: Flame
};

const rarityColors = {
  common: 'from-gray-400 to-gray-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-orange-600'
};

const categoryIcons = {
  completion: BookOpen,
  performance: Trophy,
  streak: Flame,
  special: Crown
};

export function BadgeWall({ userBadges, availableBadges }: BadgeWallProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');

  // Merge user badges with available badges
  const allBadges = availableBadges.map(badge => {
    const userBadge = userBadges.find(ub => ub.badgeId === badge.id);
    return {
      ...badge,
      isUnlocked: !!userBadge,
      unlockedAt: userBadge?.unlockedAt
    };
  });

  // Filter badges
  const filteredBadges = allBadges.filter(badge => {
    const categoryMatch = selectedCategory === 'all' || badge.category === selectedCategory;
    const rarityMatch = selectedRarity === 'all' || badge.rarity === selectedRarity;
    return categoryMatch && rarityMatch;
  });

  // Statistics
  const totalBadges = availableBadges.length;
  const unlockedBadges = userBadges.length;
  const totalPoints = userBadges.reduce((sum, ub) => sum + ub.badge.points, 0);

  const categories = ['all', ...Object.keys(categoryIcons)] as const;
  const rarities = ['all', 'common', 'rare', 'epic', 'legendary'] as const;

  const BadgeCard = ({ badge }: { badge: BadgeData & { isUnlocked: boolean; unlockedAt?: string } }) => {
    const IconComponent = iconMap[badge.icon as keyof typeof iconMap] || Award;
    const isLocked = !badge.isUnlocked;

    return (
      <Card className={`relative overflow-hidden transition-all duration-300 hover:scale-105 ${
        isLocked ? 'opacity-60 grayscale' : ''
      }`}>
        <CardContent className="p-6 text-center space-y-4">
          {/* Rarity Border */}
          <div className={`absolute inset-0 bg-gradient-to-br ${rarityColors[badge.rarity]} opacity-10`} />
          
          {/* Lock Overlay */}
          {isLocked && (
            <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
              <Lock className="h-8 w-8 text-gray-400" />
            </div>
          )}

          {/* Badge Icon */}
          <div className={`relative mx-auto w-16 h-16 rounded-full bg-gradient-to-br ${rarityColors[badge.rarity]} 
                          flex items-center justify-center shadow-lg`}>
            <IconComponent className="h-8 w-8 text-white" />
            {badge.rarity === 'legendary' && (
              <div className="absolute -top-1 -right-1">
                <Crown className="h-5 w-5 text-yellow-400" />
              </div>
            )}
          </div>

          {/* Badge Info */}
          <div className="space-y-2">
            <h3 className="font-bold text-lg">{badge.name}</h3>
            <p className="text-sm text-gray-600 min-h-[3rem]">{badge.description}</p>
            
            {/* Badges */}
            <div className="flex justify-center gap-2 flex-wrap">
              <Badge 
                variant="outline" 
                className={`text-xs capitalize bg-gradient-to-r ${rarityColors[badge.rarity]} text-white border-0`}
              >
                {badge.rarity}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {badge.points} pts
              </Badge>
            </div>

            {/* Criteria */}
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              {badge.criteria.type === 'lessons_completed' && `Complete ${badge.criteria.threshold} lessons`}
              {badge.criteria.type === 'quiz_score' && `Score ${badge.criteria.threshold}% average on quizzes`}
              {badge.criteria.type === 'streak_days' && `Maintain ${badge.criteria.threshold} day learning streak`}
              {badge.criteria.type === 'points_earned' && `Earn ${badge.criteria.threshold} points`}
              {badge.criteria.type === 'special_action' && badge.criteria.details}
            </div>

            {/* Unlock Date */}
            {badge.isUnlocked && badge.unlockedAt && (
              <p className="text-xs text-green-600 font-medium">
                Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistics Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Badge Collection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{unlockedBadges}</div>
              <div className="text-sm text-gray-600">Badges Earned</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {totalBadges > 0 ? Math.round((unlockedBadges / totalBadges) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">Collection Complete</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{totalPoints}</div>
              <div className="text-sm text-gray-600">Badge Points</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{unlockedBadges}/{totalBadges}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${totalBadges > 0 ? (unlockedBadges / totalBadges) * 100 : 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => {
                  const CategoryIcon = category === 'all' ? Award : categoryIcons[category as keyof typeof categoryIcons];
                  return (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="capitalize"
                    >
                      <CategoryIcon className="h-4 w-4 mr-2" />
                      {category}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Rarity Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Rarity</label>
              <div className="flex flex-wrap gap-2">
                {rarities.map(rarity => (
                  <Button
                    key={rarity}
                    variant={selectedRarity === rarity ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRarity(rarity)}
                    className="capitalize"
                  >
                    {rarity === 'legendary' && <Crown className="h-4 w-4 mr-2" />}
                    {rarity}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredBadges.map(badge => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>

      {/* Empty State */}
      {filteredBadges.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No badges found</h3>
            <p className="text-gray-500">
              {selectedCategory !== 'all' || selectedRarity !== 'all' 
                ? 'Try adjusting your filters to see more badges.' 
                : 'Start learning to earn your first badge!'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}