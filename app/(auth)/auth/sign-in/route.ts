import type { NextRequest } from 'next/server';

import { HttpAuthenticationError } from '@/lib/errors';
import { createSupabaseServerClient } from '@/lib/services/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient(cookies());
  const redirectURL = new URL('/auth/callback', request.url);

  const scopes =
    'user-read-email user-read-playback-position user-library-read';
  const result = await supabase.auth.signInWithOAuth({
    options: {
      redirectTo: redirectURL.toString(),
      scopes,
    },
    provider: 'spotify',
  });

  if (result.error) {
    return new HttpAuthenticationError(result.error).toNextResponse();
  }

  return NextResponse.redirect(result.data.url, {
    status: 301,
  });
}
