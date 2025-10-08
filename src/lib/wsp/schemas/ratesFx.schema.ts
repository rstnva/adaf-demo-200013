// Zod schema para RatesFx
import { z } from 'zod';
export const RatesFxSchema = z.object({
  dxy: z.number(),
  ust2y: z.number(),
  ust10y: z.number(),
  spread2s10s: z.number(),
  ts: z.number(),
});
