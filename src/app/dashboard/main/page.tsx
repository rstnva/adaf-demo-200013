import { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, BarChart3, Search, Settings } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'ADAF Dashboard Pro - Financial Intelligence Platform',
};

/**
 * Main dashboard page
 */
export default function DashboardMainPage() {
  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to ADAF Dashboard Pro - Your Financial Intelligence Platform
          </p>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Research & Backtesting</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Research</div>
            <p className="text-xs text-muted-foreground">
              Design and test signal-based strategies
            </p>
            <div className="mt-4">
              <Button asChild className="w-full">
                <Link href="/research">Open Research</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Reports</div>
            <p className="text-xs text-muted-foreground">
              Generate institutional-grade reports
            </p>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/reports">View Reports</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Control Panel</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Control</div>
            <p className="text-xs text-muted-foreground">
              System controls and configuration
            </p>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/control">Open Control</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OP-X Triage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">OP-X</div>
            <p className="text-xs text-muted-foreground">
              Opportunity analysis and triage
            </p>
            <div className="mt-4">
              <Button asChild variant="outline" className="w-full">
                <Link href="/opx">Open OP-X</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system health and performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">All systems operational</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform activity</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              View recent backtests, reports, and system events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common platform operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button asChild size="sm" className="w-full">
                <Link href="/research">New Backtest</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href="/reports">Generate Report</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}