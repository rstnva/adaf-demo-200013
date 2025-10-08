/**
 * RBAC (Role-Based Access Control) Types and Constants
 */

export const ROLES = ['viewer', 'analyst', 'admin'] as const;
export type Role = typeof ROLES[number];

// Role hierarchy for permission checking
export const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 1,
  analyst: 2, 
  admin: 3
} as const;

export interface AuthContext {
  role: Role;
  email?: string;
  source: 'apikey' | 'session';
}

export interface WhoamiResponse {
  role: Role;
  email?: string;
}

export interface ApiKeyData {
  id: string;
  preview: string;
  role: Role;
  active: boolean;
  createdAt: string;
  createdBy: string;
}

export interface CreateApiKeyRequest {
  role: Role;
  createdBy: string;
}

export interface CreateApiKeyResponse {
  id: string;
  token: string; // Only returned once!
  preview: string;
  role: Role;
  createdBy: string;
}

export interface DisableApiKeyRequest {
  tokenPrefix: string;
  reason?: string;
  actor: string;
}

export interface DisableApiKeyResponse {
  ok: boolean;
  disabled?: number; // Count of keys disabled
}

/**
 * Check if a role meets minimum requirements
 */
export function hasMinimumRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Get role permissions description
 */
export function getRolePermissions(role: Role): string[] {
  switch (role) {
    case 'viewer':
      return ['Read access to all data endpoints'];
    case 'analyst':
      return [
        'All viewer permissions',
        'OP-X approve/reject actions',
        'Worker process trigger',
        'DQP retry/acknowledge actions'
      ];
    case 'admin':
      return [
        'All analyst permissions', 
        'Control panel access',
        'Limits and guardrails management',
        'API key management',
        'Compliance checklist management'
      ];
    default:
      return [];
  }
}