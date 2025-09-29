import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function Home() {
  // If Clerk is not configured, redirect to login for password protection
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    redirect('/login');
  }

  try {
    const user = await currentUser();
    
    if (user) {
      redirect('/dashboard');
    } else {
      redirect('/sign-in');
    }
  } catch (error) {
    // If Clerk fails, redirect to login
    console.error('Clerk error:', error);
    redirect('/login');
  }
}
