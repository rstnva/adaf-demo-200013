import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { Role, AuthContext, hasMinimumRole } from '@/types/auth';
import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Generate a secure random API key token
 */
export function generateApiToken(): string {
  return crypto.randomBytes(20).toString('hex'); // 40 character hex string
}

/**
 * Hash a token using bcrypt (secure and well-tested)
 */
export async function hashToken(token: string): Promise<string> {
  const saltRounds = 12; // Strong security, reasonable performance
  return await bcrypt.hash(token, saltRounds);
}

/**
 * Verify a token against its hash
 */
export async function verifyToken(token: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(token, hash);
  } catch {
    return false;
  }
}

/**
 * Get token preview (first 8 characters)
 */
export function getTokenPreview(token: string): string {
  return token.substring(0, 8);
}

/**
 * Extract authorization token from request headers
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Get authentication context from request
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  // Try API key first
  const token = extractToken(request);
  if (token) {
    return await getAuthFromApiKey(token);
  }

  // TODO: Add session-based auth here if needed
  // For now, we only support API key authentication
  
  return null;
}

/**
 * Get authentication context from API key
 */
async function getAuthFromApiKey(token: string): Promise<AuthContext | null> {
  try {
    // Get all active API keys to check against
    const apiKeys = await prisma.apiKey.findMany({
      where: { active: true },
      include: { role: true }
    });

    // Check token against each hash
    for (const apiKey of apiKeys) {
      const isValid = await verifyToken(token, apiKey.tokenHash);
      if (isValid) {
        return {
          role: apiKey.role.name as Role,
          source: 'apikey'
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error verifying API key:', error);
    return null;
  }
}

/**
 * Middleware helper to require minimum role for endpoint
 */
export async function requireRole(
  request: NextRequest, 
  minRole: Role
): Promise<{ authorized: boolean; context?: AuthContext; error?: string }> {
  
  const authContext = await getAuthContext(request);
  
  if (!authContext) {
    return { 
      authorized: false, 
      error: 'Authentication required' 
    };
  }

  if (!hasMinimumRole(authContext.role, minRole)) {
    return { 
      authorized: false, 
      context: authContext,
      error: `Insufficient permissions. Required: ${minRole}, have: ${authContext.role}` 
    };
  }

  return { 
    authorized: true, 
    context: authContext 
  };
}

/**
 * Sanitize actor field for audit logs
 */
export function sanitizeActor(actor: string): string {
  if (!actor || typeof actor !== 'string') {
    return 'unknown';
  }
  
  // Remove control characters and limit length
  return actor
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .substring(0, 120)
    .trim();
}

/**
 * Create audit log entry for RBAC actions
 */
export async function auditRbacAction(
  entity: string,
  entityId: string,
  action: string,
  actor: string,
  oldData: Record<string, unknown> = {},
  newData: Record<string, unknown> = {}
): Promise<void> {
  try {
    await prisma.changeLog.create({
      data: {
        actor: sanitizeActor(actor),
        entity,
        entityId,
        field: action,
        old: JSON.stringify(oldData),
        new: JSON.stringify(newData)
      }
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit failure shouldn't break the main operation
  }
}