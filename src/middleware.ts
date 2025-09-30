import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/documents(.*)',
  '/companions(.*)',
  '/chat(.*)',
  '/settings(.*)',
]);

export default function middleware(req: NextRequest) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // Validate Clerk key format - should start with pk_test_ or pk_live_
  const isValidClerkKey = publishableKey && 
    (publishableKey.startsWith('pk_test_') || publishableKey.startsWith('pk_live_')) &&
    publishableKey.length > 20;

  // If Clerk is not configured or invalid, allow all requests
  if (!isValidClerkKey) {
    return NextResponse.next();
  }

  // Use Clerk middleware when configured properly
  return clerkMiddleware(async (auth, request) => {
    if (isProtectedRoute(request)) await auth.protect();
  })(req);
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};