// RBAC (Role-Based Access Control) helper functions
// Simplified mock implementation for ADAF Dashboard

export type Role = 'viewer' | 'user' | 'admin' | 'system'

// Mock user roles for development - in production this would come from JWT/session
const mockUserRole: Role = 'admin' // Default to admin for development

/**
 * Require a specific role or higher to access an endpoint
 * @param requiredRole - Minimum role required
 * @throws {Error} If user doesn't have sufficient permissions
 */
export async function requireRole(requiredRole: Role): Promise<void> {
  // In development, we allow everything for admin
  if (mockUserRole === 'admin') {
    return
  }
  
  // Role hierarchy: viewer < user < admin < system
  const roleHierarchy: Record<Role, number> = {
    viewer: 1,
    user: 2,
    admin: 3,
    system: 4
  }
  
  const userLevel = roleHierarchy[mockUserRole]
  const requiredLevel = roleHierarchy[requiredRole]
  
  if (userLevel < requiredLevel) {
    throw new Error(`Insufficient permissions. Required: ${requiredRole}, Current: ${mockUserRole}`)
  }
}

/**
 * Check if user has a specific role without throwing
 * @param role - Role to check
 * @returns True if user has role or higher
 */
export function hasRole(role: Role): boolean {
  try {
    requireRole(role)
    return true
  } catch {
    return false
  }
}

/**
 * Get current user's role (mock implementation)
 * @returns Current user role
 */
export function getCurrentRole(): Role {
  return mockUserRole
}