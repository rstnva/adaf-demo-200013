'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Target, TrendingUp, Users, Clock } from 'lucide-react';
import Link from 'next/link';

interface OpportunityScore {
  id: string;
  title: string;
  strategy: string;
  score: number;
  confidence: number;
  status: 'blocking' | 'consensus' | 'review';
  estimatedReturn: number;
  timeHorizon: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export function OpxTopScores() {
  // Mock OP-X data
  const opportunities: OpportunityScore[] = [
    {
      id: '1',
      title: 'ETH LST Arbitrage',
      strategy: 'Liquid Staking Arbitrage',
      score: 92,
      confidence: 87,
      status: 'consensus',
      estimatedReturn: 12.5,
      timeHorizon: '14-21d',
      riskLevel: 'low'
    },
    {
      id: '2',
      title: 'BTC Funding Capture',
      strategy: 'Perpetual Funding',
      score: 89,
      confidence: 94,
      status: 'blocking',
      estimatedReturn: 8.3,
      timeHorizon: '7-14d',
      riskLevel: 'medium'
    },
    {
      id: '3',
      title: 'SOL Ecosystem Play',
      strategy: 'Ecosystem Growth',
      score: 76,
      confidence: 71,
      status: 'review',
      estimatedReturn: 25.1,
      timeHorizon: '30-45d',
      riskLevel: 'high'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'blocking': return 'adaf-badge-severity-red';
      case 'consensus': return 'adaf-badge-severity-ok';
      case 'review': return 'adaf-badge-severity-amber';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 font-bold';
    if (score >= 75) return 'text-blue-600 font-semibold';
    if (score >= 60) return 'text-yellow-600 font-medium';
    return 'text-gray-600';
  };

  return (
    <Card className="adaf-card adaf-hover-lift">
      <CardHeader className="adaf-card-header">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            OP-X Top Opportunities
          </CardTitle>
          <Link href="/opx">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1" />
              Full Triage
            </Button>
          </Link>
        </div>
        <div className="text-sm text-gray-600">
          Ranked by composite opportunity score
        </div>
      </CardHeader>
      <CardContent className="adaf-card-content">
        <div className="space-y-4">
          {opportunities.map((opp, index) => (
            <div key={opp.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{opp.title}</div>
                    <div className="text-sm text-gray-600">{opp.strategy}</div>
                  </div>
                </div>
                <Badge className={getStatusColor(opp.status)}>
                  {opp.status.toUpperCase()}
                </Badge>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Score</span>
                  </div>
                  <div className={`text-lg ${getScoreColor(opp.score)}`}>
                    {opp.score}
                    <span className="text-sm text-gray-500 ml-1">
                      ({opp.confidence}% conf.)
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Est. Return</span>
                  </div>
                  <div className="text-lg font-semibold text-green-600">
                    +{opp.estimatedReturn}%
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gray-500" />
                    <span className="text-gray-600">{opp.timeHorizon}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-gray-500" />
                    <span className={getRiskColor(opp.riskLevel)}>
                      {opp.riskLevel} risk
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs">
                  Details →
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            <strong>3 opportunities</strong> above 75 score threshold. 
            <strong>1 blocked</strong> pending risk review.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}