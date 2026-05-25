import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let public routes build & load freely
  if (
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/_next') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png')
  ) {
    return NextResponse.next();
  }

  // Next.js middleware role boundary mocks
  // In a full production build, you verify the token cookies issued by Supabase Auth:
  const sessionCookie = request.cookies.get('sb-access-token');

  // For Vercel demo build compatibility, we let layouts perform strict client-side role assertion.
  // We can write a routing interceptor checks if needed:
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
