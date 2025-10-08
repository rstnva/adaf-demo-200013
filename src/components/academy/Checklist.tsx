'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle,
  Circle,
  Clock,
  Users,
  Eye,
  AlertTriangle,
  CheckSquare,
  Square
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  isRequired: boolean;
  estimatedMinutes: number;
  verificationMethod?: 'self_check' | 'peer_review' | 'instructor_check';
}

interface Checklist {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  items: ChecklistItem[];
}

interface ChecklistProgress {
  [itemId: string]: boolean;
}

interface ChecklistProps {
  checklist: Checklist;
  progress: ChecklistProgress;
  onUpdateProgress: (itemId: string, completed: boolean) => void;
  onComplete?: () => void;
}

export function Checklist({ checklist, progress, onUpdateProgress, onComplete }: ChecklistProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleItemToggle = (itemId: string, completed: boolean) => {
    onUpdateProgress(itemId, completed);
  };

  // Calculate completion stats
  const totalItems = checklist.items.length;
  const completedItems = checklist.items.filter(item => progress[item.id]).length;
  const requiredItems = checklist.items.filter(item => item.isRequired);
  const completedRequiredItems = requiredItems.filter(item => progress[item.id]).length;
  const totalEstimatedTime = checklist.items.reduce((sum, item) => sum + item.estimatedMinutes, 0);
  const completedTime = checklist.items
    .filter(item => progress[item.id])
    .reduce((sum, item) => sum + item.estimatedMinutes, 0);

  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const allRequiredCompleted = requiredItems.length === completedRequiredItems;
  const canComplete = allRequiredCompleted;

  const getVerificationIcon = (method?: ChecklistItem['verificationMethod']) => {
    switch (method) {
      case 'peer_review':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'instructor_check':
        return <Eye className="h-4 w-4 text-purple-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getVerificationLabel = (method?: ChecklistItem['verificationMethod']) => {
    switch (method) {
      case 'peer_review':
        return 'Peer Review Required';
      case 'instructor_check':
        return 'Instructor Check Required';
      default:
        return 'Self Check';
    }
  };

  return (
    <div className="space-y-6">
      {/* Checklist Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-6 w-6" />
            {checklist.title}
          </CardTitle>
          <p className="text-gray-600">{checklist.description}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{completedItems}</div>
              <div className="text-sm text-gray-600">of {totalItems} completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(progressPercentage)}%
              </div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{completedRequiredItems}</div>
              <div className="text-sm text-gray-600">of {requiredItems.length} required</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{completedTime}m</div>
              <div className="text-sm text-gray-600">of {totalEstimatedTime}m estimated</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Completion Status */}
          {!allRequiredCompleted && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-800 font-medium">
                  {requiredItems.length - completedRequiredItems} required items remaining
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checklist Items */}
      <div className="space-y-4">
        {checklist.items.map((item, index) => {
          const isCompleted = progress[item.id];
          const isExpanded = expandedItems[item.id];

          return (
            <Card 
              key={item.id} 
              className={`transition-all duration-200 ${
                isCompleted ? 'bg-green-50 border-green-200' : ''
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleItemToggle(item.id, !isCompleted)}
                    className="mt-1 flex-shrink-0"
                  >
                    {isCompleted ? (
                      <CheckSquare className="h-6 w-6 text-green-600" />
                    ) : (
                      <Square className="h-6 w-6 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 
                          className={`font-medium cursor-pointer ${
                            isCompleted ? 'text-green-800 line-through' : ''
                          }`}
                          onClick={() => toggleItemExpansion(item.id)}
                        >
                          {index + 1}. {item.title}
                        </h3>
                        {!isExpanded && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 ml-4">
                        {item.isRequired && (
                          <Badge variant="destructive" className="text-xs">
                            Required
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.estimatedMinutes}m
                        </Badge>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="space-y-3 pt-2 border-t border-gray-200">
                        <p className="text-gray-700">{item.description}</p>
                        
                        {/* Verification Method */}
                        <div className="flex items-center gap-2 text-sm">
                          {getVerificationIcon(item.verificationMethod)}
                          <span className="text-gray-600">
                            {getVerificationLabel(item.verificationMethod)}
                          </span>
                        </div>

                        {/* Collapse Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleItemExpansion(item.id)}
                          className="text-xs"
                        >
                          Show Less
                        </Button>
                      </div>
                    )}

                    {/* Show More Button (when collapsed) */}
                    {!isExpanded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleItemExpansion(item.id)}
                        className="text-xs text-blue-600"
                      >
                        Show Details
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Complete Button */}
      {onComplete && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="space-y-4">
              {canComplete ? (
                <div>
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-green-800 mb-2">
                    All required items completed!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    You have successfully completed all required checklist items.
                  </p>
                  <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">
                    Mark Checklist Complete
                  </Button>
                </div>
              ) : (
                <div>
                  <Circle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    Complete required items
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Complete all {requiredItems.length - completedRequiredItems} remaining required items to finish this checklist.
                  </p>
                  <Button disabled variant="outline">
                    {requiredItems.length - completedRequiredItems} Required Items Remaining
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}