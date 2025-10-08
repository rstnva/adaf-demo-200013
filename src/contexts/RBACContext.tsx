"use client";
import React, { createContext, useContext } from 'react';
import { recordEvent } from '@/metrics/wsp.metrics';

type RBACContextValue = {
  hasPermission: (perm: string) => boolean;
  userId?: string;
  permissions: string[];
};

const RBACContext = createContext<RBACContextValue>({
  hasPermission: () => true,
  permissions: [],
});

export function RBACProvider({ children, permissions = [], userId }: { children: React.ReactNode; permissions?: string[]; userId?: string }) {
  const value: RBACContextValue = {
    permissions,
    userId,
    hasPermission: (perm: string) => permissions.includes(perm),
  };
  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

export function useRBAC() {
  return useContext(RBACContext);
}

export function rbacTelemetry(route: string, allowed: boolean, userId?: string) {
  // Minimal telemetry: reuse metrics event counter and console log
  try { recordEvent(); } catch {}
  try { console.info('RBAC', { route, allowed, userId }); } catch {}
}
