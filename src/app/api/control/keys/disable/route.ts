import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireRole, auditRbacAction } from '@/lib/auth/helpers';
import { DisableApiKeyRequest, DisableApiKeyResponse } from '@/types/auth';
import { incApiRequest } from '@/lib/metrics';

const prisma = new PrismaClient();

/**
 * POST /api/control/keys/disable
 * 
 * Disable API key by token prefix (admin only)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authCheck = await requireRole(request, 'admin');
    
    if (!authCheck.authorized) {
      incApiRequest('control_keys_disable', 'POST', 403);
      return NextResponse.json(
        { error: 'forbidden', need: 'admin', message: authCheck.error },
        { status: 403 }
      );
    }

    const body = await request.json() as DisableApiKeyRequest;
    
    // Validate required fields
    if (!body.tokenPrefix || !body.actor) {
      incApiRequest('control_keys_disable', 'POST', 400);
      return NextResponse.json(
        { error: 'Missing required fields: tokenPrefix, actor' },
        { status: 400 }
      );
    }

    // Find API keys that match the prefix
    const matchingKeys = await prisma.apiKey.findMany({
      where: {
        preview: {
          startsWith: body.tokenPrefix
        },
        active: true
      },
      include: { role: true }
    });

    if (matchingKeys.length === 0) {
      incApiRequest('control_keys_disable', 'POST', 404);
      return NextResponse.json(
        { error: 'No active API keys found matching that prefix' },
        { status: 404 }
      );
    }

    // Disable matching keys
    const disabledKeys = await prisma.apiKey.updateMany({
      where: {
        id: { in: matchingKeys.map(k => k.id) },
        active: true
      },
      data: { active: false }
    });

    // Audit each disabled key
    for (const key of matchingKeys) {
      await auditRbacAction(
        'ApiKey',
        key.id,
        'DISABLE',
        body.actor,
        {
          active: true,
          role: key.role.name,
          preview: key.preview
        },
        {
          active: false,
          reason: body.reason || 'Manually disabled',
          disabledBy: body.actor
        }
      );
    }

    const response: DisableApiKeyResponse = {
      ok: true,
      disabled: disabledKeys.count
    };

    console.log(`🔒 Disabled ${disabledKeys.count} API key(s) matching prefix: ${body.tokenPrefix}`);

    incApiRequest('control_keys_disable', 'POST', 200);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Disable API key error:', error);
    incApiRequest('control_keys_disable', 'POST', 500);
    
    return NextResponse.json(
      { error: 'Failed to disable API key' },
      { status: 500 }
    );
  }
}