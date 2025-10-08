// ================================================================================================
// Security Headers Middleware - Production Security Hardening
// ================================================================================================
// Comprehensive security headers implementation including CSP, HSTS, and other security measures
// Implements CSP in report-only mode initially for safe rollout
// ================================================================================================

import { NextRequest, NextResponse } from 'next/server';

// CSP violation report interface
interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    referrer: string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    disposition: string;
    'blocked-uri': string;
    'line-number'?: number;
    'column-number'?: number;
    'source-file'?: string;
    'status-code': number;
    'script-sample'?: string;
  };
}

// Security headers configuration
export interface SecurityConfig {
  enableCSP: boolean;
  cspReportOnly: boolean;
  enableHSTS: boolean;
  hstsMaxAge: number;
  enableFrameDeny: boolean;
  customHeaders?: Record<string, string>;
}

/**
 * Default security configuration
 */
const DEFAULT_CONFIG: SecurityConfig = {
  enableCSP: true,
  cspReportOnly: true, // Start in report-only mode
  enableHSTS: process.env.NODE_ENV === 'production',
  hstsMaxAge: 15552000, // 180 days
  enableFrameDeny: true
};

/**
 * Content Security Policy configuration
 */
function getCSPDirectives(reportOnly: boolean = false): string {
  const nonce = generateNonce();
  
  const directives = [
    "default-src 'self'",
    "img-src 'self' data: blob: https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Relaxed for Next.js
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self' https: wss: ws:",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ];
  
  if (reportOnly) {
    directives.push("report-uri /api/security/csp-report");
    directives.push("report-to csp-endpoint");
  }
  
  return directives.join('; ');
}

/**
 * Generate a random nonce for CSP
 */
function generateNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
}

/**
 * Apply security headers to response
 */
export function applySecurityHeaders(
  response: NextResponse, 
  config: SecurityConfig = DEFAULT_CONFIG
): NextResponse {
  
  // Strict Transport Security (HTTPS only)
  if (config.enableHSTS) {
    response.headers.set(
      'Strict-Transport-Security',
      `max-age=${config.hstsMaxAge}; includeSubDomains; preload`
    );
  }
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Frame options - prevent clickjacking
  if (config.enableFrameDeny) {
    response.headers.set('X-Frame-Options', 'DENY');
  }
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'no-referrer');
  
  // Permissions policy - disable unnecessary APIs
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );
  
  // Content Security Policy
  if (config.enableCSP) {
    const cspDirectives = getCSPDirectives(config.cspReportOnly);
    const headerName = config.cspReportOnly 
      ? 'Content-Security-Policy-Report-Only' 
      : 'Content-Security-Policy';
    
    response.headers.set(headerName, cspDirectives);
  }
  
  // Cross-Origin headers
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  
  // Additional security headers
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Custom headers if provided
  if (config.customHeaders) {
    for (const [key, value] of Object.entries(config.customHeaders)) {
      response.headers.set(key, value);
    }
  }
  
  return response;
}

/**
 * Security headers middleware
 */
export async function withSecurityHeaders(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse,
  config?: SecurityConfig
): Promise<NextResponse> {
  try {
    // Execute the original handler
    const response = await handler(request);
    
    // Apply security headers
    return applySecurityHeaders(response, { ...DEFAULT_CONFIG, ...config });
    
  } catch (error) {
    console.error('Security headers middleware error:', error);
    
    // Create error response with security headers
    const errorResponse = new NextResponse('Internal Server Error', { status: 500 });
    return applySecurityHeaders(errorResponse, { ...DEFAULT_CONFIG, ...config });
  }
}

/**
 * Middleware function for automatic security header application
 */
export function securityHeadersMiddleware(config?: SecurityConfig) {
  return async function (
    request: NextRequest,
    handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
  ): Promise<NextResponse> {
    return withSecurityHeaders(request, handler, config);
  };
}

/**
 * Report-to directive configuration for CSP
 */
export function getReportToDirective(): string {
  return JSON.stringify({
    group: 'csp-endpoint',
    'max_age': 86400,
    endpoints: [
      {
        url: '/api/security/csp-report',
        priority: 1,
        weight: 1
      }
    ]
  });
}

/**
 * Environment-specific configuration
 */
export function getSecurityConfig(): SecurityConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    enableCSP: process.env.SECURITY_ENABLE_CSP !== 'false',
    cspReportOnly: process.env.SECURITY_CSP_ENFORCE !== 'true', // Report-only by default
    enableHSTS: isProduction && process.env.SECURITY_ENABLE_HSTS !== 'false',
    hstsMaxAge: parseInt(process.env.SECURITY_HSTS_MAX_AGE || '15552000'),
    enableFrameDeny: process.env.SECURITY_ENABLE_FRAME_DENY !== 'false',
    customHeaders: {
      'X-Powered-By': 'ADAF Dashboard Pro', // Replace default Next.js header
      'X-Version': process.env.APP_VERSION || '1.0.0',
      'X-Environment': process.env.NODE_ENV || 'development'
    }
  };
}