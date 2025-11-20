
import { z } from 'zod';

import{createOrderSchema} from '../zod/index.js';


type CreateOrderBody = z.infer<typeof createOrderSchema>;



