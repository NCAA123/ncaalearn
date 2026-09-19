import { createMiddleware } from '@tanstack/react-start'
import { createSupabaseServerClient } from './server'

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      throw new Error('Unauthorized: No valid session');
    }

    return next({
      context: {
        supabase,
        userId: data.user.id,
      },
    });
  },
);
