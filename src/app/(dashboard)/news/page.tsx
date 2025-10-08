'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CardHeader } from '@/components/common/CardHeader';
import { SkeletonPatterns } from '@/components/common/SkeletonBlock';
import { ErrorState } from '@/components/common/ErrorState';
import { useNewsReg } from '@/hooks';
import { formatDistanceToNow } from 'date-fns';
import { 
  Search,
  ExternalLink,
  Filter,
  Calendar,
  FileText,
  Scale,
  Globe,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface NewsFilters {
  search: string;
  category: string;
  dateRange: string;
}

// News Tab Component
function NewsTab() {
  const [filters, setFilters] = useState<NewsFilters>({
    search: '',
    category: 'all',
    dateRange: '7d'
  });
  const [currentPage, setCurrentPage] = useState(1);
  
  const { news } = useNewsReg();
  const { data: newsData, isLoading, error } = news;
  
  const itemsPerPage = 10;
  
  // Filter and paginate news
  const filteredNews = newsData?.filter(item => {
    const matchesSearch = !filters.search || 
      item.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.summary.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesCategory = filters.category === 'all' || item.topic === filters.category;
    
    // Date filtering
    if (filters.dateRange !== 'all') {
      const days = parseInt(filters.dateRange.replace('d', ''));
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const itemDate = new Date(item.publishedAt);
      if (itemDate < cutoff) return false;
    }
    
    return matchesSearch && matchesCategory;
  }) || [];
  
  const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
  const paginatedNews = filteredNews.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );
  
  const categories = ['all', 'crypto', 'traditional', 'regulation', 'technical'];
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4 items-center">
          <Input placeholder="Search news..." disabled />
          <Button variant="outline" disabled>
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
        <SkeletonPatterns.ListItem />
      </div>
    );
  }
  
  if (error) {
    return <ErrorState title="Failed to load news" />;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search news articles..."
            value={filters.search}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, search: e.target.value }));
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <select 
            value={filters.category}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, category: e.target.value }));
              setCurrentPage(1);
            }}
            className="px-3 py-2 border rounded-md text-sm"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
          
          <select 
            value={filters.dateRange}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, dateRange: e.target.value }));
              setCurrentPage(1);
            }}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Time</option>
            <option value="1d">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filteredNews.length} articles found
      </div>

      {/* News List */}
      <div className="space-y-4">
        {paginatedNews.map((article, index) => (
          <Card key={index} className="adaf-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <FileText className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold text-lg leading-tight">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {article.topic}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {article.source}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {article.summary}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true })}
                      </div>
                      <span>by {article.source}</span>
                    </div>
                    
                    <Button variant="ghost" size="sm" asChild>
                      <a href={article.url} target="_blank" rel="noopener noreferrer">
                        Read more
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => 
                page === 1 || 
                page === totalPages || 
                Math.abs(page - currentPage) <= 2
              )
              .map((page, index, arr) => (
                <div key={page} className="flex items-center gap-1">
                  {index > 0 && arr[index - 1] !== page - 1 && (
                    <span className="text-muted-foreground px-2">...</span>
                  )}
                  <Button
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8"
                  >
                    {page}
                  </Button>
                </div>
              ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Regulation Tab Component
function RegulationTab() {
  const [filters, setFilters] = useState({
    search: '',
    jurisdiction: 'all',
    status: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  
  const { regulation } = useNewsReg();
  const { data: regData, isLoading, error } = regulation;
  
  const itemsPerPage = 8;
  
  // Filter and paginate regulations
  const filteredRegs = regData?.filter(item => {
    const matchesSearch = !filters.search || 
      item.title.toLowerCase().includes(filters.search.toLowerCase()) ||
      item.summary.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesJurisdiction = filters.jurisdiction === 'all' || item.jurisdiction === filters.jurisdiction;
    const matchesStatus = filters.status === 'all' || item.type === filters.status;
    
    return matchesSearch && matchesJurisdiction && matchesStatus;
  }) || [];
  
  const totalPages = Math.ceil(filteredRegs.length / itemsPerPage);
  const paginatedRegs = filteredRegs.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );
  
  const jurisdictions = ['all', 'US', 'EU', 'UK', 'Asia', 'Global'];
  const statuses = ['all', 'proposed', 'active', 'draft', 'pending'];
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonPatterns.ListItem />
      </div>
    );
  }
  
  if (error) {
    return <ErrorState title="Failed to load regulations" />;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search regulations..."
            value={filters.search}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, search: e.target.value }));
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <select 
            value={filters.jurisdiction}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, jurisdiction: e.target.value }));
              setCurrentPage(1);
            }}
            className="px-3 py-2 border rounded-md text-sm"
          >
            {jurisdictions.map(jur => (
              <option key={jur} value={jur}>
                {jur === 'all' ? 'All Jurisdictions' : jur}
              </option>
            ))}
          </select>
          
          <select 
            value={filters.status}
            onChange={(e) => {
              setFilters(prev => ({ ...prev, status: e.target.value }));
              setCurrentPage(1);
            }}
            className="px-3 py-2 border rounded-md text-sm"
          >
            {statuses.map(status => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {filteredRegs.length} regulations found
      </div>

      {/* Regulations List */}
      <div className="space-y-4">
        {paginatedRegs.map((regulation, index) => (
          <Card key={index} className="adaf-card hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Scale className="h-5 w-5 text-purple-600 mt-1 flex-shrink-0" />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold text-lg leading-tight">
                      {regulation.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge 
                        variant={regulation.type === 'law' ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {regulation.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {regulation.jurisdiction}
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground text-sm line-clamp-2">
                    {regulation.summary}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(regulation.effectiveDate), { addSuffix: true })}
                      </div>
                      <span>Impact: {regulation.impact}</span>
                    </div>
                    
                    <Badge variant="outline" className="text-xs">
                      {regulation.jurisdiction}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm text-muted-foreground px-4">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Calendar Tab Component
function CalendarTab() {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  
  // Mock calendar events - in real implementation, this would come from an API
  const calendarEvents = [
    {
      id: '1',
      title: 'Bitcoin ETF Decision',
      date: new Date(2024, 1, 15),
      type: 'regulatory',
      importance: 'high',
      description: 'SEC decision on Bitcoin spot ETF applications'
    },
    {
      id: '2',
      title: 'Federal Reserve Meeting',
      date: new Date(2024, 1, 20),
      type: 'economic',
      importance: 'high',
      description: 'FOMC meeting and interest rate decision'
    },
    {
      id: '3',
      title: 'Ethereum Upgrade',
      date: new Date(2024, 1, 28),
      type: 'technical',
      importance: 'medium',
      description: 'Network upgrade and performance improvements'
    },
  ];
  
  return (
    <div className="space-y-6">
      {/* Calendar Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">Economic & Regulatory Calendar</h3>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              Month
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Week
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* Upcoming Events */}
      <Card className="adaf-card">
        <CardHeader title="Upcoming Events" />
        <CardContent className="p-6 pt-0">
          <div className="space-y-3">
            {calendarEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="flex-shrink-0">
                  <div className={cn(
                    "w-3 h-3 rounded-full mt-1",
                    event.importance === 'high' ? 'bg-red-500' :
                    event.importance === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  )} />
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="font-medium">{event.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {event.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {event.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {event.date.toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main News Page
export default function NewsPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Breadcrumbs */}
      <nav className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Dashboard</Link>
        <span className="mx-2">›</span>
        <span>News & Research</span>
      </nav>

      {/* News & Research Tabs */}
      <Card className="adaf-card">
        <CardHeader 
          title="News & Research Hub"
          badge="Market intelligence and regulatory updates"
        />
        
        <CardContent className="p-6 pt-0">
          <Tabs defaultValue="news" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="news" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                News
              </TabsTrigger>
              <TabsTrigger value="regulation" className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Reg-Watch
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="news" className="mt-6">
              <NewsTab />
            </TabsContent>
            
            <TabsContent value="regulation" className="mt-6">
              <RegulationTab />
            </TabsContent>
            
            <TabsContent value="calendar" className="mt-6">
              <CalendarTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}