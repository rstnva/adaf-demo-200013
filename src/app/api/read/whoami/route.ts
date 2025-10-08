import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/helpers';
import { WhoamiResponse } from '@/types/auth';
import { incApiRequest } from '@/lib/metrics';

/**
 * GET /api/read/whoami
 * 
 * Returns current user's role and email (if available)
 * Supports both API key and session authentication
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    incApiRequest('whoami', 'GET', 200);

    const authContext = await getAuthContext(request);
    
    if (!authContext) {
      // Return viewer role for unauthenticated requests (public access)
      const response: WhoamiResponse = {
        role: 'viewer'
      };
      
      return NextResponse.json(response);
    }

    const response: WhoamiResponse = {
      role: authContext.role,
      email: authContext.email
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Whoami error:', error);
    incApiRequest('whoami', 'GET', 500);
    
    return NextResponse.json(
      { error: 'Failed to get authentication status' },
      { status: 500 }
    );
  }
}