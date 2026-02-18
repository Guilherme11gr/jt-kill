import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  // Skip Supabase if env vars not configured (dev mode)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not write logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make your app
  // very slow (user session not refreshed on every request).

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes check
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/invite') ||
    request.nextUrl.pathname.startsWith('/auth');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isPublicRoute = request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/public');

  if (!user && !isAuthRoute && !isApiRoute && !isPublicRoute) {
    // Redirect to login if accessing protected route without auth
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // JKILL-260: Paywall bypass fix - check subscription for /onboarding and /admin
  if (user) {
    const requiresSubscription = 
      request.nextUrl.pathname.startsWith('/onboarding') ||
      request.nextUrl.pathname.startsWith('/admin');

    if (requiresSubscription) {
      // Check subscription via Supabase (edge-safe)
      // For now, we'll check a cookie-based subscription flag
      // In production, this should be a database check or use Stripe customer ID
      const hasSubscription = request.cookies.get('subscription_active')?.value === 'true';

      if (!hasSubscription) {
        // Redirect to checkout if no active subscription
        const url = request.nextUrl.clone();
        url.pathname = '/checkout';
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
