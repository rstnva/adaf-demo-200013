'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import Link from 'next/link';

export function GuardrailsCard() {
  // Mock guardrails data
  const guardrails = [
    {
      name: 'Loan-to-Value Ratio',
      current: 65,
      threshold: 80,
      status: 'ok',
      description: 'Portfolio LTV within safe limits'
    },
    {
      name: 'Health Factor',
      current: 2.1,
      threshold: 1.2,
      status: 'ok',
      description: 'Sufficient collateral buffer'
    },
    {
      name: 'Slippage Impact',
      current: 12,
      threshold: 15,
      status: 'warning',
      description: 'Approaching maximum acceptable slippage'
    },
    {
      name: 'Real Yield APY',
      current: 4.2,
      threshold: 3.0,
      status: 'ok',
      description: 'Yield targets met across strategies'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <Shield className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok': return 'adaf-badge-severity-ok';
      case 'warning': return 'adaf-badge-severity-amber';
      case 'critical': return 'adaf-badge-severity-red';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProgressWidth = (current: number, threshold: number) => {
    const percentage = (current / threshold) * 100;
    return Math.min(percentage, 100);
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'ok': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const criticalCount = guardrails.filter(g => g.status === 'critical').length;
  const warningCount = guardrails.filter(g => g.status === 'warning').length;
  const okCount = guardrails.filter(g => g.status === 'ok').length;

  return (
    <Card className="adaf-card adaf-hover-lift">
      <CardHeader className="adaf-card-header">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Guardrails & Controls
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">{okCount}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-600">{warningCount}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600">{criticalCount}</span>
            </div>
            <Link href="/control/guardrails">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                Manage
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="adaf-card-content">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guardrails.map((guardrail) => (
            <div key={guardrail.name} className="p-4 border border-gray-200 rounded-lg">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(guardrail.status)}
                  <h4 className="font-medium">{guardrail.name}</h4>
                </div>
                <Badge className={getStatusColor(guardrail.status)}>
                  {guardrail.status.toUpperCase()}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Current: {guardrail.current}{guardrail.name.includes('Ratio') || guardrail.name.includes('Impact') ? '%' : guardrail.name.includes('Factor') ? 'x' : '%'}</span>
                  <span>Limit: {guardrail.threshold}{guardrail.name.includes('Ratio') || guardrail.name.includes('Impact') ? '%' : guardrail.name.includes('Factor') ? 'x' : '%'}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(guardrail.status)}`}
                    style={{ width: `${getProgressWidth(guardrail.current, guardrail.threshold)}%` }}
                  />
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600">{guardrail.description}</p>
            </div>
          ))}
        </div>

        {/* Summary */}
        {(warningCount > 0 || criticalCount > 0) && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                {warningCount > 0 && `${warningCount} guardrail(s) in warning state`}
                {warningCount > 0 && criticalCount > 0 && ', '}
                {criticalCount > 0 && `${criticalCount} critical violation(s)`}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}