import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Limits for OP-X...')

  // Guardrails (limits) - required for execution plan validation
  const limits = [
    { key: 'slippage', value: 0.02, notes: 'porcentaje máximo de slippage (2%)' },
    { key: 'ltv', value: 0.8, notes: 'loan-to-value máximo (80%)' },
    { key: 'hf', value: 1.6, notes: 'health factor mínimo' },
    { key: 'realyield', value: 0.06, notes: 'umbral de real yield (6%)' },
  ]
  
  for (const l of limits) {
    await prisma.limit.upsert({
      where: { key: l.key },
      update: { value: l.value, notes: l.notes },
      create: { key: l.key, value: l.value, notes: l.notes }
    });
  }

  // Execution planning sample data
  console.log('🚀 Seeding sample execution plan data...')
  
  // Create sample execution plan (without opportunity dependency)
  await prisma.$executeRaw`
    INSERT INTO execution_plans (id, "oppId", status, sizing, risk, checklist, handoffs, expiry, artifacts, notes, "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid()::text,
      'sample_opp_001',
      'ready',
      ${JSON.stringify({
        notionalPctNAV: 0.15,
        legs: [
          { market: 'ETH/USDC', side: 'BUY', qty: 500, venue: 'Uniswap' },
          { market: 'stETH/ETH', side: 'BUY', qty: 500, venue: 'Lido' }
        ]
      })}::jsonb,
      ${JSON.stringify({
        sl: { type: 'price', value: 1800, unit: 'usd' },
        tp: { type: 'price', value: 2200, unit: 'usd' },
        maxSlippagePct: 0.005
      })}::jsonb,
      ${JSON.stringify([
        { id: 'check_001', title: 'Verify protocol audit reports', done: true, owner: 'Research' },
        { id: 'check_002', title: 'Confirm slashing risk < 0.1%', done: true, owner: 'Risk' },
        { id: 'check_003', title: 'Test withdrawal mechanisms', done: false, owner: 'Trading' },
        { id: 'check_004', title: 'Set up monitoring alerts', done: false, owner: 'Ops' },
        { id: 'check_005', title: 'Legal review of staking terms', done: true, owner: 'Legal' }
      ])}::jsonb,
      ${JSON.stringify([
        { role: 'Trading', owner: 'alice@example.com', note: 'Execute position after final checks' },
        { role: 'Ops', owner: 'bob@example.com', note: 'Monitor and maintain positions' },
        { role: 'Legal', owner: 'carol@example.com', note: 'Review quarterly compliance' }
      ])}::jsonb,
      ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)},
      ${JSON.stringify([
        { kind: 'chart', url: 'https://example.com/charts/eth-staking-analysis.png', addedAt: new Date().toISOString() },
        { kind: 'calc', url: 'https://example.com/calcs/risk-assessment.xlsx', addedAt: new Date().toISOString() }
      ])}::jsonb,
      'Initial plan setup for ETH liquid staking strategy. Conservative sizing due to protocol risk.',
      ${new Date()},
      ${new Date()}
    ) ON CONFLICT ("oppId") DO NOTHING
  `;

  console.log('✅ Seed completed')
}

main().catch((e) => {
  console.error('❌ Seeding failed:', e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})