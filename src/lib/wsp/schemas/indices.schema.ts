// Zod schema para Indices
import { z } from 'zod';
export const IndicesSchema = z.object({
  spx: z.number(),
  ndx: z.number(),
  vix: z.number(),
  ts: z.number(),
  dChange: z.object({
    spx: z.number(),
    ndx: z.number(),
    vix: z.number(),
  }).optional(),
});
