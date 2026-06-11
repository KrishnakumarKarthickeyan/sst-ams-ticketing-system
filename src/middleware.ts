import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/forgot-password'];

// Role → home dashboard
const ROLE_HOME: Record<string, string> = {
  SuperAdmin: '/admin/dashboard',
  Manager: '/manager/dashboard',
  Consultant: '/consultant/dashboard',
  Customer: '/customer/dashboard',
};

// Route prefix → roles allowed to enter it
const PROTECTED_PREFIXES: { prefix: string; roles: string[] }[] = [
  { prefix: '/admin', roles: ['SuperAdmin'] },
  { prefix: '/manager', roles: ['Manager', 'SuperAdmin'] },
  { prefix: '/consultant', roles: ['Consultant'] },
  { prefix: '/customer', roles: ['Customer'] },
];

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
  if (!user) {
    // Session invalid (e.g. revoked after a password reset) but stale auth cookies
    // may remain — delete them on the redirect so the client can't keep hydrating
    // a dead session and ping-ponging between /login and the dashboard.
    const redirect = NextResponse.redirect(new URL('/login', request.url));
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith('sb-')) {
        redirect.cookies.delete(cookie.name);
      }
    }
    return redirect;
  }

  // First-login forced password reset (from JWT metadata)
  const isFirstLogin =
    user.user_metadata?.first_login_completed === false ||
    user.user_metadata?.force_password_change === true;
  if (isFirstLogin && pathname !== '/first-login-reset') {
    return NextResponse.redirect(new URL('/first-login-reset', request.url));
  }

  // Role enforcement per route segment. Prefer role from JWT metadata (no DB hit);
  // fall back to a single profiles lookup when metadata is absent.
  const matched = PROTECTED_PREFIXES.find(p => pathname.startsWith(p.prefix));
  if (matched) {
    let role: string | undefined =
      (user.app_metadata as any)?.role || (user.user_metadata as any)?.role;

    if (!role) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      role = prof?.role;
    }

    if (!role || !matched.roles.includes(role)) {
      const home = role && ROLE_HOME[role] ? ROLE_HOME[role] : '/login';
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
