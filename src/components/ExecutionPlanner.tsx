'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle, Clock, FileText, Upload } from 'lucide-react';
import { ExecutionPlan, PlanStatus } from '@/types/execution-plan';

interface ExecutionPlannerProps {
  oppId: string;
  onPlanChange?: (plan: ExecutionPlan | null) => void;
}

interface PlanData {
  plan?: ExecutionPlan;
  opp: {
    id: string;
    title: string;
    description: string;
    status: string;
    score: number;
    consensus: number;
    blocking: string[];
    createdAt: string;
  };
  limits: {
    slippage: number;
    ltv: number;
    hf: number;
    realyield: number;
  };
  metrics: {
    ltv: number;
    hf: number;
    slippage: number;
    realyield: number;
    nav: number;
  };
}

const statusColors: Record<PlanStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  ready: 'bg-blue-100 text-blue-800',
  live: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-red-100 text-red-800',
};

const statusIcons: Record<PlanStatus, React.ReactNode> = {
  draft: <FileText className="w-4 h-4" />,
  ready: <Clock className="w-4 h-4" />,
  live: <CheckCircle className="w-4 h-4" />,
  paused: <AlertTriangle className="w-4 h-4" />,
  closed: <FileText className="w-4 h-4" />,
};

export default function ExecutionPlanner({ oppId, onPlanChange }: ExecutionPlannerProps) {
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Load plan data
  useEffect(() => {
    async function loadPlanData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/read/opx/plan?oppId=${oppId}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load plan data');
        }
        
        setPlanData(data);
        onPlanChange?.(data.plan);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadPlanData();
  }, [oppId, onPlanChange]);

  // Toggle task completion
  const handleToggleTask = async (taskId: string) => {
    if (!planData?.plan) return;

    try {
      const response = await fetch('/api/read/opx/plan/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oppId, taskId })
      });

      if (response.ok) {
        // Reload plan data to get updated checklist
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  // Change plan status
  const handleStatusChange = async (newStatus: PlanStatus) => {
    try {
      const response = await fetch('/api/read/opx/plan/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oppId, status: newStatus })
      });

      if (response.ok) {
        // Reload plan data
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading execution plan...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!planData) return null;

  const { plan, opp, limits, metrics } = planData;
  const checklistCompletion = plan ? 
    (plan.checklist.filter(task => task.done).length / plan.checklist.length * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">{opp.title}</CardTitle>
              <CardDescription className="mt-1">{opp.description}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {plan && (
                <Badge className={statusColors[plan.status]} variant="secondary">
                  <span className="flex items-center gap-1">
                    {statusIcons[plan.status]}
                    {plan.status.toUpperCase()}
                  </span>
                </Badge>
              )}
              <Badge variant="outline">Score: {opp.score}</Badge>
            </div>
          </div>
          {opp.blocking.length > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-4 w-4" />
                <span>Blocking issues: {opp.blocking.join(', ')}</span>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {!plan ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 mb-4">No execution plan exists for this opportunity.</p>
            <Button onClick={() => handleStatusChange('draft')}>
              Create Execution Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sizing">Sizing & Risk</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
            <TabsTrigger value="handoffs">Handoffs</TabsTrigger>
            <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Control */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Plan Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(['draft', 'ready', 'live', 'paused', 'closed'] as PlanStatus[]).map(status => (
                      <Button
                        key={status}
                        variant={plan.status === status ? 'default' : 'outline'}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleStatusChange(status)}
                      >
                        {statusIcons[status]}
                        <span className="ml-2">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Checklist Progress */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Checklist Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{plan.checklist.filter(t => t.done).length} / {plan.checklist.length} completed</span>
                      <span>{Math.round(checklistCompletion)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${checklistCompletion}%` }}
                      ></div>
                    </div>
                    {checklistCompletion < 80 && plan.status === 'live' && (
                      <p className="text-xs text-red-600">
                        ⚠️ Need 80%+ completion for live status
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Key Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>LTV:</span>
                      <span className={metrics.ltv > limits.ltv ? 'text-red-600' : 'text-green-600'}>
                        {(metrics.ltv * 100).toFixed(1)}% / {(limits.ltv * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Health Factor:</span>
                      <span className={metrics.hf < limits.hf ? 'text-red-600' : 'text-green-600'}>
                        {metrics.hf.toFixed(2)} / {limits.hf.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Real Yield:</span>
                      <span className={metrics.realyield < limits.realyield ? 'text-red-600' : 'text-green-600'}>
                        {(metrics.realyield * 100).toFixed(1)}% / {(limits.realyield * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sizing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Position Sizing</CardTitle>
                <CardDescription>Configure trade sizing and risk parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Notional % NAV</label>
                    <Input 
                      type="number" 
                      defaultValue={plan.sizing.notionalPctNAV} 
                      disabled 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Slippage %</label>
                    <Input 
                      type="number" 
                      defaultValue={plan.risk.maxSlippagePct} 
                      disabled 
                    />
                  </div>
                </div>
                
                {plan.sizing.legs && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Trade Legs</label>
                    <div className="mt-2 space-y-2">
                      {plan.sizing.legs.map((leg, idx) => (
                        <div key={idx} className="flex gap-2 p-2 border rounded text-sm">
                          <span className="font-mono">{leg.market}</span>
                          <Badge variant={leg.side === 'BUY' ? 'default' : 'destructive'}>
                            {leg.side}
                          </Badge>
                          <span>Qty: {leg.qty}</span>
                          <span>@ {leg.venue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checklist" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Execution Checklist</CardTitle>
                <CardDescription>
                  {plan.checklist.filter(t => t.done).length} of {plan.checklist.length} tasks completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plan.checklist.map((task) => (
                    <div key={task.id} className="flex items-center space-x-3 p-2 border rounded">
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => handleToggleTask(task.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className={task.done ? 'line-through text-gray-500' : ''}>
                          {task.title}
                        </span>
                        <div className="text-xs text-gray-500">
                          Owner: {task.owner}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="handoffs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Role Handoffs</CardTitle>
                <CardDescription>Coordination between trading, ops, legal, and RI teams</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plan.handoffs.map((handoff, idx) => (
                    <div key={idx} className="p-3 border rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>{handoff.role}</Badge>
                        {handoff.owner && (
                          <span className="text-sm text-gray-600">Owner: {handoff.owner}</span>
                        )}
                      </div>
                      {handoff.note && (
                        <p className="text-sm text-gray-700">{handoff.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="artifacts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Evidence & Artifacts</CardTitle>
                <CardDescription>Charts, calculations, approvals, and documentation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {plan.artifacts.map((artifact, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 border rounded">
                      <Badge variant="outline">{artifact.kind}</Badge>
                      <a 
                        href={artifact.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 text-blue-600 hover:underline"
                      >
                        {artifact.url}
                      </a>
                      <span className="text-xs text-gray-500">
                        {new Date(artifact.addedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  
                  <Button variant="outline" size="sm" className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    Add Artifact
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}