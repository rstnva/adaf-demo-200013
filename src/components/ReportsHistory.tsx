'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  FileText, 
  Send, 
  Calendar, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  RefreshCw,
  Activity,
  Download,
  Mail,
  Database
} from 'lucide-react';
import { type ReportHistoryResponse, type ReportHealthResponse, type GeneratedReport } from '@/types/scheduling';
import { LineageDrawer } from '@/components/LineageDrawer';

interface DeliveryModalProps {
  report: GeneratedReport;
  onClose: () => void;
  onDeliver: (reportId: string, recipients: string[], notes: string) => Promise<void>;
}

function DeliveryModal({ report, onClose, onDeliver }: DeliveryModalProps) {
  const [recipients, setRecipients] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isDelivering, setIsDelivering] = useState(false);

  const handleDeliver = async () => {
    if (!recipients.trim()) return;
    
    setIsDelivering(true);
    try {
      const emailList = recipients.split(/[,\n]/).map(email => email.trim()).filter(Boolean);
      await onDeliver(report.id, emailList, notes);
      onClose();
    } catch (error) {
      console.error('Delivery failed:', error);
    } finally {
      setIsDelivering(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Deliver Report</DialogTitle>
          <DialogDescription>
            Send {report.type} report for {report.period} to recipients
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="recipients">Recipients (one per line)</Label>
            <Textarea
              id="recipients"
              placeholder="user@example.com&#10;admin@company.com"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="notes">Delivery Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes about this delivery..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isDelivering}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeliver} 
              disabled={!recipients.trim() || isDelivering}
              className="flex items-center"
            >
              {isDelivering ? (
                <Clock className="h-4 w-4 mr-2 animate-pulse" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isDelivering ? 'Sending...' : 'Send Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface HealthIndicatorProps {
  health: ReportHealthResponse;
}

function HealthIndicator({ health }: HealthIndicatorProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertCircle className="h-4 w-4" />;
      case 'critical': return <AlertCircle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-sm">
          <Activity className="h-4 w-4 mr-2" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <Badge className={`${getStatusColor(health.status)} flex items-center`}>
            {getStatusIcon(health.status)}
            <span className="ml-1 capitalize">{health.status}</span>
          </Badge>
          <div className="text-sm text-gray-600">
            {health.reportsLast30d} reports (30d)
          </div>
        </div>
        
        {health.issues && health.issues.length > 0 && (
          <div className="mt-3 space-y-1">
            {health.issues.slice(0, 2).map((issue, index) => (
              <div key={index} className="text-xs text-gray-600 flex items-start">
                <AlertCircle className="h-3 w-3 mr-1 mt-0.5 text-yellow-500" />
                {issue}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportsHistory() {
  const [history, setHistory] = useState<ReportHistoryResponse | null>(null);
  const [health, setHealth] = useState<ReportHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
  const [page, setPage] = useState(0);
  const [isDelivering, setIsDelivering] = useState(false);
  
  // Lineage drawer state
  const [lineageDrawer, setLineageDrawer] = useState<{
    open: boolean;
    entity: 'signal' | 'metric' | 'report';
    refId: string;
  }>({
    open: false,
    entity: 'report',
    refId: ''
  });

  useEffect(() => {
    loadData();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [historyRes, healthRes] = await Promise.all([
        fetch(`/api/read/reports/history?offset=${page * 10}&limit=10`),
        fetch('/api/read/reports/health')
      ]);

      if (!historyRes.ok || !healthRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [historyData, healthData] = await Promise.all([
        historyRes.json(),
        healthRes.json()
      ]);

      setHistory(historyData);
      setHealth(healthData);
    } catch (error) {
      console.error('Failed to load reports data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeliver = async (reportId: string, recipients: string[], notes: string) => {
    setIsDelivering(true);
    try {
      const response = await fetch('/api/actions/report/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          recipients,
          actor: 'user@adaf.com', // In production, get from auth context
          notes,
          deliveryMethod: 'email'
        })
      });

      if (!response.ok) {
        throw new Error('Delivery failed');
      }

      const result = await response.json();
      console.log('Delivery result:', result);
      
      // Refresh data to show updated delivery status
      await loadData();
    } catch (error) {
      console.error('Delivery error:', error);
      throw error;
    } finally {
      setIsDelivering(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Loading reports history...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Status */}
      {health && <HealthIndicator health={health} />}

      {/* Reports History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Generated Reports
          </CardTitle>
          <CardDescription>
            History of institutional reports with delivery tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history && history.reports.length > 0 ? (
            <div className="space-y-4">
              {history.reports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="capitalize">
                        {report.type}
                      </Badge>
                      <span className="font-medium">{report.period}</span>
                      {getStatusBadge(report.status)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedReport(report)}
                        disabled={isDelivering}
                        className="flex items-center"
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Deliver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLineageDrawer({
                          open: true,
                          entity: 'report',
                          refId: report.url || report.id
                        })}
                        className="flex items-center"
                        title="Ver lineage de datos"
                      >
                        <Database className="h-3 w-3 mr-1" />
                        Lineage
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Generated:</span>
                      <div>{formatDate(report.createdAt)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">By:</span>
                      <div className="flex items-center">
                        <User className="h-3 w-3 mr-1" />
                        {report.actor}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Size:</span>
                      <div>{(report.fileSizeBytes / 1024).toFixed(1)} KB</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Deliveries:</span>
                      <div>{report.successfulDeliveries} sent</div>
                    </div>
                  </div>

                  {report.lastDeliveryAt && (
                    <div className="text-xs text-gray-500 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Last delivered: {formatDate(report.lastDeliveryAt)}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Pagination */}
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-600">
                  Showing {page * 10 + 1}-{Math.min((page + 1) * 10, history.total)} of {history.total}
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(page + 1)}
                    disabled={!history.hasMore}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No reports generated yet</p>
              <p className="text-sm">Generate your first report from the Generate tab</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Modal */}
      {selectedReport && (
        <DeliveryModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onDeliver={handleDeliver}
        />
      )}

      {/* Lineage Drawer */}
      <LineageDrawer
        open={lineageDrawer.open}
        onClose={() => setLineageDrawer(prev => ({ ...prev, open: false }))}
        entity={lineageDrawer.entity}
        refId={lineageDrawer.refId}
      />
    </div>
  );
}