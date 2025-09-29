'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simple password check (you can change this password)
    const correctPassword = 'MeridianWriter2024!';
    
    if (password === correctPassword) {
      // Set authentication token
      localStorage.setItem('meridian-auth', 'authenticated');
      sessionStorage.setItem('meridian-auth', 'authenticated');
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to Meridian Writer
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your password to access your writing workspace
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="pr-12"
              disabled={loading}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !password.trim()}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Your Default Password:
            </h3>
            <p className="text-blue-700 dark:text-blue-300 font-mono text-sm">
              MeridianWriter2024!
            </p>
            <p className="text-blue-600 dark:text-blue-400 text-xs mt-2">
              You can change this in the app settings after logging in
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            🔒 Your work is protected • 💾 AI companion memory persists • 📚 Story bible saved
          </p>
        </div>
      </Card>
    </div>
  );
}