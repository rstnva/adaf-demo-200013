'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Key, Plus, X, Shield, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ApiKeyData, 
  CreateApiKeyRequest, 
  CreateApiKeyResponse,
  DisableApiKeyRequest,
  DisableApiKeyResponse,
  Role,
  ROLES,
  getRolePermissions
} from '@/types/auth';

interface KeysPanelProps {
  userRole: Role;
}

export function KeysPanel({ userRole }: KeysPanelProps) {
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{ role: Role; createdBy: string }>({
    role: 'viewer',
    createdBy: ''
  });
  const [disableData, setDisableData] = useState<{ prefix: string; reason: string }>({
    prefix: '',
    reason: ''
  });
  const [createdToken, setCreatedToken] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Load API keys
  const loadKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/control/keys');
      
      if (!response.ok) {
        throw new Error(`Failed to load keys: ${response.status}`);
      }
      
      const data = await response.json();
      setKeys(data.keys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  // Create new API key
  const createKey = async () => {
    try {
      setLoading(true);
      setError('');
      
      const request: CreateApiKeyRequest = {
        role: newKeyData.role,
        createdBy: newKeyData.createdBy.trim()
      };

      const response = await fetch('/api/control/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create key: ${response.status}`);
      }

      const data: CreateApiKeyResponse = await response.json();
      setCreatedToken(data.token);
      setSuccess(`API key created successfully! Preview: ${data.preview}`);
      
      // Reset form and reload keys
      setNewKeyData({ role: 'viewer', createdBy: '' });
      setShowCreateDialog(false);
      loadKeys();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setLoading(false);
    }
  };

  // Disable API keys by prefix
  const disableKeys = async () => {
    try {
      setLoading(true);
      setError('');
      
      const request: DisableApiKeyRequest = {
        tokenPrefix: disableData.prefix.trim(),
        reason: disableData.reason.trim(),
        actor: 'admin-ui' // Could be made dynamic
      };

      const response = await fetch('/api/control/keys/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to disable keys: ${response.status}`);
      }

      const data: DisableApiKeyResponse = await response.json();
      setSuccess(`Successfully disabled ${data.disabled} API key(s)`);
      
      // Reset form and reload keys
      setDisableData({ prefix: '', reason: '' });
      setShowDisableDialog(false);
      loadKeys();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable API keys');
    } finally {
      setLoading(false);
    }
  };

  // Load keys on mount
  useEffect(() => {
    if (userRole === 'admin') {
      loadKeys();
    }
  }, [userRole]);

  // Only admins should see this panel
  if (userRole !== 'admin') {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Shield className="w-5 h-5" />
            Access Denied
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">API key management requires admin privileges.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Warning */}
      <div className="border border-amber-200 bg-amber-50 p-4 rounded-lg">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span>
            <strong>Security Notice:</strong> API keys provide direct access to ADAF systems. 
            Create keys only for trusted services and disable them immediately if compromised.
          </span>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="border border-red-200 bg-red-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="border border-green-200 bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <Shield className="h-4 w-4 text-green-600" />
            <span>{success}</span>
          </div>
        </div>
      )}

      {/* Created Token Display */}
      {createdToken && (
        <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start gap-2 text-blue-800">
            <Key className="h-4 w-4 text-blue-600 mt-1" />
            <div className="flex-1">
              <div className="mb-2">
                <strong>New API Key (save this - it won&apos;t be shown again!):</strong>
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-blue-100 px-2 py-1 rounded font-mono text-sm break-all flex-1">
                  {createdToken}
                </code>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setCreatedToken('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              API Key Management
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowCreateDialog(true)}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create Key
              </Button>
              <Button 
                onClick={() => setShowDisableDialog(true)}
                disabled={loading}
                variant="destructive"
              >
                <X className="w-4 h-4 mr-1" />
                Disable Keys
              </Button>
              <Button 
                onClick={loadKeys}
                disabled={loading}
                variant="outline"
              >
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && keys.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Key className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Loading API keys...
            </div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Key className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No API keys found
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div 
                  key={key.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    key.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {key.preview}***
                        </code>
                        <Badge 
                          variant={key.role === 'admin' ? 'destructive' : key.role === 'analyst' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {key.role}
                        </Badge>
                        <Badge variant={key.active ? 'default' : 'secondary'}>
                          {key.active ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {key.createdBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(key.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-gray-600 mb-1">Permissions:</div>
                    <ul className="text-xs text-gray-500 space-y-0.5">
                      {getRolePermissions(key.role).slice(0, 2).map((perm, idx) => (
                        <li key={idx}>• {perm}</li>
                      ))}
                      {getRolePermissions(key.role).length > 2 && (
                        <li>• +{getRolePermissions(key.role).length - 2} more...</li>
                      )}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for system integration. The key will only be shown once.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-2">Role Level</label>
              <Select 
                value={newKeyData.role} 
                onValueChange={(role: Role) => setNewKeyData(prev => ({ ...prev, role }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(role => (
                    <SelectItem key={role} value={role}>
                      {role} - {getRolePermissions(role)[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="createdBy" className="block text-sm font-medium mb-2">Created By (identifier)</label>
              <Input
                id="createdBy"
                value={newKeyData.createdBy}
                onChange={(e) => setNewKeyData(prev => ({ ...prev, createdBy: e.target.value }))}
                placeholder="e.g., service-name, user-email, system-id"
              />
            </div>

            <div className="border border-amber-200 bg-amber-50 p-3 rounded-lg">
              <div className="flex items-start gap-2 text-amber-800 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div>
                  <strong>Security:</strong> The API key will be shown only once. 
                  Store it securely and never commit it to version control.
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={createKey}
              disabled={loading || !newKeyData.createdBy.trim()}
            >
              {loading ? 'Creating...' : 'Create API Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Keys Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable API Keys</DialogTitle>
            <DialogDescription>
              Disable all API keys that start with the given prefix. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="prefix" className="block text-sm font-medium mb-2">Token Prefix</label>
              <Input
                id="prefix"
                value={disableData.prefix}
                onChange={(e) => setDisableData(prev => ({ ...prev, prefix: e.target.value }))}
                placeholder="e.g., ak_123abc (first 8+ characters)"
              />
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium mb-2">Reason (optional)</label>
              <textarea
                id="reason"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={disableData.reason}
                onChange={(e) => setDisableData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g., Security incident, Service decommissioned, etc."
              />
            </div>

            <div className="border border-red-200 bg-red-50 p-3 rounded-lg">
              <div className="flex items-start gap-2 text-red-800 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <strong>Warning:</strong> This will disable ALL keys matching the prefix. 
                  Double-check the prefix to avoid accidentally disabling the wrong keys.
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDisableDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={disableKeys}
              disabled={loading || !disableData.prefix.trim()}
            >
              {loading ? 'Disabling...' : 'Disable Keys'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}