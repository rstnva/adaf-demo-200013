// Zod schema para Catalyst
import { z } from 'zod';
export const CalendarSchema = z.array(z.object({
  date: z.string(),
  time: z.string().optional(),
  kind: z.enum(['FOMC', 'CPI', 'OPEX', 'UNLOCK', 'EARNINGS']),
  title: z.string(),
  importance: z.enum(['low', 'med', 'high']),
}));
