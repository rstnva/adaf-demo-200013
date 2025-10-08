'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui';
import {
  Home,
  TrendingUp,
  Link as LinkIcon,
  BarChart3,
  Newspaper,
  Search,
  Target,
  FileText,
  Shield,
  GitBranch,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    icon: Home,
    label: 'Home',
    description: 'Dashboard overview'
  },
  {
    href: '/markets',
    icon: TrendingUp,
    label: 'Markets',
    description: 'ETF flows, funding, comparatives'
  },
  {
    href: '/onchain',
    icon: LinkIcon,
    label: 'On-Chain',
    description: 'TVL, stablecoin flows, real yield'
  },
  {
    href: '/derivatives',
    icon: BarChart3,
    label: 'Derivatives',
    description: 'Funding rates, gamma exposure'
  },
  {
    href: '/news',
    icon: Newspaper,
    label: 'News',
    description: 'News sentinel, regulation watch'
  },
  {
    href: '/research',
    icon: Search,
    label: 'Research',
    description: 'Backtesting, analysis tools'
  },
  {
    href: '/opx',
    icon: Target,
    label: 'OP-X',
    description: 'Strategy opportunities'
  },
  {
    href: '/reports',
    icon: FileText,
    label: 'Reports',
    description: 'Generated reports & delivery'
  },
  {
    href: '/dqp',
    icon: Shield,
    label: 'DQP',
    description: 'Data quality & governance'
  },
  {
    href: '/lineage',
    icon: GitBranch,
    label: 'Lineage',
    description: 'Data lineage & provenance'
  },
  {
    href: '/academy',
    icon: GraduationCap,
    label: 'Academy',
    description: 'Learning bootcamp'
  },
  {
    href: '/control',
    icon: Settings,
    label: 'Control',
    description: 'Limits, rules, auditing'
  }
];

export function NavLeft() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <nav className={cn(
      "flex h-screen flex-col border-r bg-white transition-all duration-300",
      sidebarCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600" />
            <span className="font-bold text-xl">ADAF</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="h-8 w-8 p-0"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-full justify-start transition-colors",
                    sidebarCollapsed ? "px-2" : "px-3",
                    isActive && "bg-blue-50 text-blue-700 hover:bg-blue-100"
                  )}
                >
                  <Icon className={cn("h-4 w-4 flex-shrink-0", sidebarCollapsed ? "" : "mr-3")} />
                  {!sidebarCollapsed && (
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{item.label}</span>
                      {item.description && (
                        <span className="text-xs text-gray-500 font-normal">
                          {item.description}
                        </span>
                      )}
                    </div>
                  )}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="border-t p-4">
          <div className="text-xs text-gray-500">
            <div className="font-medium">ADAF Dashboard Pro</div>
            <div>v2.1.0 • {new Date().getFullYear()}</div>
          </div>
        </div>
      )}
    </nav>
  );
}