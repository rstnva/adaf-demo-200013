// ================================================================================================
// Next.js Middleware - Security and Rate Limiting
// ================================================================================================
// Global middleware for applying security headers and rate limiting across the application
// Applied to all routes except static files and excluded paths
// ================================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { applySecurityHeaders, getSecurityConfig } from '@/middleware/securityHeaders';

/**
 * Paths that should be excluded from middleware processing
 */
const EXCLUDED_PATHS = [
  '/_next',
  '/favicon.ico',
  '/api/metrics', // Don't apply security headers to metrics endpoint
  '/api/stream', // Don't interfere with SSE streams
];

/**
 * Check if path should be excluded from middleware
 */
function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PATHS.some(path => pathname.startsWith(path));
}

/**
 * Main middleware function
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname } = new URL(request.url);
  
  // Skip middleware for excluded paths
  if (isExcludedPath(pathname)) {
    return NextResponse.next();
  }
  
  // Create response
  const response = NextResponse.next();
  
  // Apply security headers
  const securityConfig = getSecurityConfig();
  const securedResponse = applySecurityHeaders(response, securityConfig);
  
  // Add middleware processing header for debugging
  securedResponse.headers.set('X-Middleware-Applied', 'security-headers');
  
  // Log security-relevant requests in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`🛡️  Security middleware applied to: ${pathname}`);
  }
  
  return securedResponse;
}

/**
 * Matcher configuration for middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/metrics (Prometheus endpoint)
     * - api/stream (SSE endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/metrics|api/stream|_next/static|_next/image|favicon.ico).*)',
  ],
};