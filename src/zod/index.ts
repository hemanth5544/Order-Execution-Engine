import {z} from 'zod';


export const createOrderSchema = z.object({
  orderType: z.enum(['market', 'limit', 'sniper']),
  tokenIn: z.string().min(1),
  tokenOut: z.string().min(1),
  amountIn: z.number().positive(),
  slippageTolerance: z.number().min(0).max(1).optional().default(0.01),
  userId: z.string().min(1),
});
