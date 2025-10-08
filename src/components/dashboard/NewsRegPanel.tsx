'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Newspaper, Scale, Calendar } from 'lucide-react';
import Link from 'next/link';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  impact: 'high' | 'medium' | 'low';
  timestamp: string;
  category: 'market' | 'regulation' | 'tech';
}

export function NewsRegPanel() {
  const [activeTab, setActiveTab] = useState<'news' | 'regulation' | 'calendar'>('news');


  // Mock news data
  const newsData: NewsItem[] = [
    {
      id: '1',
      title: 'SEC Approves Additional Bitcoin ETF Applications',
      source: 'Reuters',
      impact: 'high',
      timestamp: '2 hours ago',
      category: 'regulation'
    },
    {
      id: '2', 
      title: 'Major Bank Announces Crypto Treasury Holdings',
      source: 'Bloomberg',
      impact: 'medium',
      timestamp: '4 hours ago',
      category: 'market'
    },
    {
      id: '3',
      title: 'Ethereum Network Upgrade Completed Successfully',
      source: 'CoinDesk',
      impact: 'medium',
      timestamp: '6 hours ago',
      category: 'tech'
    }
  ];

  const regEvents = [
    { date: 'Oct 15', event: 'CFTC Hearing on Digital Assets', status: 'pending' },
    { date: 'Oct 20', event: 'EU MiCA Implementation Deadline', status: 'critical' },
    { date: 'Oct 25', event: 'Fed Rate Decision', status: 'high' }
  ];

  // Defensive: handle missing/empty data
  const hasNews = Array.isArray(newsData) && newsData.length > 0;
  const hasRegEvents = Array.isArray(regEvents) && regEvents.length > 0;

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'adaf-badge-severity-red';
      case 'medium': return 'adaf-badge-severity-amber'; 
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="adaf-card adaf-hover-lift">
      <CardHeader className="adaf-card-header">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" />
            News & Regulation
          </CardTitle>
          <Link href="/news">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1" />
              All News
            </Button>
          </Link>
        </div>
        <div className="flex gap-2 mt-4">
          <Button
            variant={activeTab === 'news' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('news')}
          >
            <Newspaper className="h-4 w-4 mr-1" />
            News
          </Button>
          <Button
            variant={activeTab === 'regulation' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('regulation')}
          >
            <Scale className="h-4 w-4 mr-1" />
            Regulation
          </Button>
          <Button
            variant={activeTab === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('calendar')}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Calendar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="adaf-card-content">

        {activeTab === 'news' && (
          !hasNews ? (
            <div className="text-center text-red-500 py-8">No news data available.</div>
          ) : (
            <div className="space-y-3">
              {newsData.map((item) => (
                <div key={item.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm leading-tight pr-2">{item.title}</h4>
                    <Badge className={getImpactColor(item.impact)}>
                      {item.impact}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{item.source}</span>
                    <span>{item.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'regulation' && (
          !hasRegEvents ? (
            <div className="text-center text-red-500 py-8">No regulation events available.</div>
          ) : (
            <div className="space-y-3">
              {regEvents.map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{event.event}</div>
                    <div className="text-xs text-gray-600">{event.date}</div>
                  </div>
                  <Badge className={getImpactColor(event.status)}>
                    {event.status}
                  </Badge>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'calendar' && (
          <div className="adaf-empty-state">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>Calendar integration coming soon</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}