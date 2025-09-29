'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full text-center p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Something went wrong!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            An unexpected error occurred while loading the application.
          </p>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Error ID: {error.digest || 'unknown'}
          </p>
        </div>

        <div className="space-y-4">
          <Button onClick={reset} className="w-full">
            Try again
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.location.href = '/'}
          >
            Go to Home
          </Button>
        </div>

        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>If this problem persists, please try:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Refreshing the page</li>
            <li>Clearing browser cache</li>
            <li>Trying a different browser</li>
          </ul>
        </div>
      </div>
    </div>
  )
}