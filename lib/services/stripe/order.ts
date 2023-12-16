import type { Stripe } from 'stripe';

import { DatabaseError } from '@/lib/errors';
import { z } from 'zod';

import { createSupabaseServiceClient } from '../supabase/service';

const checkoutSessionSchema = z.object({
  id: z.string(),
  line_items: z.object({
    data: z.array(
      z.object({
        price: z.object({
          transform_quantity: z.object({
            divide_by: z.number(),
          }),
        }),
      }),
    ),
  }),
  metadata: z.object({
    accountId: z.number(),
    userId: z.string(),
  }),
});

export const fulfillOrder = async (session: Stripe.Checkout.Session) => {
  const validatedSession = checkoutSessionSchema.safeParse(session);

  if (!validatedSession.success) {
    throw validatedSession.error;
  }

  const supabase = createSupabaseServiceClient();

  const currentAccountCreditsQuery = await supabase
    .from('account')
    .select('ai_credit')
    .eq('id', validatedSession.data.metadata.accountId)
    .single();

  if (currentAccountCreditsQuery.error) {
    throw new DatabaseError(currentAccountCreditsQuery.error);
  }

  const updateAccountQuery = await supabase
    .from('account')
    .update({
      ai_credit:
        (currentAccountCreditsQuery.data.ai_credit ?? 0) +
        validatedSession.data.line_items.data[0].price.transform_quantity
          .divide_by,
    })
    .eq('id', validatedSession.data.metadata.accountId);

  if (updateAccountQuery.error) {
    throw new DatabaseError(updateAccountQuery.error);
  }
};
