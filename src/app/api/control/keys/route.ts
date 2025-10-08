import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireRole, generateApiToken, hashToken, getTokenPreview, auditRbacAction } from '@/lib/auth/helpers';
import { CreateApiKeyRequest, CreateApiKeyResponse, ApiKeyData } from '@/types/auth';
import { incApiRequest } from '@/lib/metrics';

const prisma = new PrismaClient();

/**
 * GET /api/control/keys
 * 
 * List API keys (admin only)
 * Returns metadata without actual tokens
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authCheck = await requireRole(request, 'admin');
    
    if (!authCheck.authorized) {
      incApiRequest('control_keys_list', 'GET', 403);
      return NextResponse.json(
        { error: 'forbidden', need: 'admin', message: authCheck.error },
        { status: 403 }
      );
    }

    const apiKeys = await prisma.apiKey.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' }
    });

    const keysData: ApiKeyData[] = apiKeys.map(key => ({
      id: key.id,
      preview: key.preview,
      role: key.role.name as 'viewer' | 'analyst' | 'admin',
      active: key.active,
      createdAt: key.createdAt.toISOString(),
      createdBy: key.createdBy
    }));

    incApiRequest('control_keys_list', 'GET', 200);
    return NextResponse.json({ keys: keysData });

  } catch (error) {
    console.error('List API keys error:', error);
    incApiRequest('control_keys_list', 'GET', 500);
    
    return NextResponse.json(
      { error: 'Failed to list API keys' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/control/keys
 * 
 * Create new API key (admin only)
 * Returns token ONLY ONCE - never stored in plaintext
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authCheck = await requireRole(request, 'admin');
    
    if (!authCheck.authorized) {
      incApiRequest('control_keys_create', 'POST', 403);
      return NextResponse.json(
        { error: 'forbidden', need: 'admin', message: authCheck.error },
        { status: 403 }
      );
    }

    const body = await request.json() as CreateApiKeyRequest;
    
    // Validate required fields
    if (!body.role || !body.createdBy) {
      incApiRequest('control_keys_create', 'POST', 400);
      return NextResponse.json(
        { error: 'Missing required fields: role, createdBy' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['viewer', 'analyst', 'admin'].includes(body.role)) {
      incApiRequest('control_keys_create', 'POST', 400);
      return NextResponse.json(
        { error: 'Invalid role. Must be viewer, analyst, or admin' },
        { status: 400 }
      );
    }

    // Find role record
    const role = await prisma.role.findUnique({
      where: { name: body.role }
    });

    if (!role) {
      incApiRequest('control_keys_create', 'POST', 400);
      return NextResponse.json(
        { error: `Role ${body.role} not found` },
        { status: 400 }
      );
    }

    // Generate token and hash
    const token = generateApiToken();
    const tokenHash = await hashToken(token);
    const preview = getTokenPreview(token);

    // Create API key record
    const apiKey = await prisma.apiKey.create({
      data: {
        tokenHash,
        preview,
        roleId: role.id,
        active: true,
        createdBy: body.createdBy
      },
      include: { role: true }
    });

    // Audit the creation
    await auditRbacAction(
      'ApiKey',
      apiKey.id,
      'CREATE',
      body.createdBy,
      {},
      {
        id: apiKey.id,
        role: apiKey.role.name,
        preview: apiKey.preview,
        active: apiKey.active,
        createdBy: apiKey.createdBy
      }
    );

    const response: CreateApiKeyResponse = {
      id: apiKey.id,
      token, // ⚠️ ONLY TIME TOKEN IS RETURNED
      preview: apiKey.preview,
      role: apiKey.role.name as 'viewer' | 'analyst' | 'admin',
      createdBy: apiKey.createdBy
    };

    incApiRequest('control_keys_create', 'POST', 201);
    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('Create API key error:', error);
    incApiRequest('control_keys_create', 'POST', 500);
    
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}