import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Authentication Not Configured
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please configure Clerk authentication keys to enable sign in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome Back
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Sign in to your AI Writer & Companion
          </p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg"
            }
          }}
        />
      </div>
    </div>
  );
}