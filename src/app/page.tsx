import { redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function Home() {
  // If Clerk is not configured, show landing page
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-2xl text-center p-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
            Welcome to Meridian Writer
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Your AI-powered writing companion with vector memory and story bible features
          </p>
          <div className="space-y-4">
            <Button asChild size="lg" className="w-full">
              <Link href="/dashboard">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/documents/new">Start Writing</Link>
            </Button>
          </div>
          <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
            <p>No registration required • Full-featured writing environment</p>
          </div>
        </div>
      </div>
    );
  }

  try {
    const user = await currentUser();
    
    if (user) {
      redirect('/dashboard');
    } else {
      redirect('/sign-in');
    }
  } catch (error) {
    // If Clerk fails, redirect to dashboard anyway
    console.error('Clerk error:', error);
    redirect('/dashboard');
  }
}
