// Zod schema para EtfFlow
import { z } from 'zod';
export const EtfFlowSchema = z.object({
  date: z.string(),
  asset: z.enum(['BTC', 'ETH']),
  issuer: z.string().optional(),
  netFlowUSD: z.number(),
  cumFlowUSD: z.number().optional(),
});
