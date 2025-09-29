import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PenTool, MessageCircle, FileText, Bot } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to AI Writer & Companion
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your personal AI assistant for writing and conversation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <PenTool className="h-8 w-8 text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold">New Document</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start writing with AI assistance
            </p>
            <Button asChild className="w-full">
              <Link href="/documents/new">Create Document</Link>
            </Button>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <MessageCircle className="h-8 w-8 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold">Chat</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Have a conversation with your AI companion
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link href="/chat">Start Chat</Link>
            </Button>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              <Bot className="h-8 w-8 text-purple-600 mr-3" />
              <h3 className="text-lg font-semibold">Companions</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Manage your AI companions
            </p>
            <Button asChild className="w-full" variant="outline">
              <Link href="/companions">View Companions</Link>
            </Button>
          </Card>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <Card className="p-4">
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No recent activity yet. Start by creating a document or chatting with a companion!
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}