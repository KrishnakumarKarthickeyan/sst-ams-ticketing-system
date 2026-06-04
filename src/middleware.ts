import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/forgot-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png')
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          ),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  // Query database profiles table to check is_active and is_locked in real-time
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_active, is_locked, first_login_completed, force_password_change')
    .eq('id', user.id)
    .single();

  if (error || !profile || profile.is_active === false || profile.is_locked === true) {
    // Session is no longer valid: sign out from auth and redirect to login
    await supabase.auth.signOut();
    const redirectResponse = NextResponse.redirect(new URL('/login', request.url));
    // Clear cookies explicitly
    request.cookies.getAll().forEach(cookie => {
      if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
        redirectResponse.cookies.delete(cookie.name);
      }
    });
    return redirectResponse;
  }

  // Use DB values to decide first-login force password reset redirections
  const isFirstLogin = profile.first_login_completed === false || profile.force_password_change === true;
  if (isFirstLogin && pathname !== '/first-login-reset') {
    return NextResponse.redirect(new URL('/first-login-reset', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
