'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  PenTool, 
  MessageCircle, 
  FileText, 
  Bot, 
  Settings, 
  Home,
  Plus,
  ChevronLeft,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Chat', href: '/chat', icon: MessageCircle },
  { name: 'Companions', href: '/companions', icon: Bot },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar */}
      <div className={cn(
        "hidden lg:flex flex-col bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {!collapsed && (
            <div className="flex items-center">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-md flex items-center justify-center mr-2">
                <PenTool className="h-4 w-4 text-white dark:text-black" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">
                AI Writer
              </span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("ml-auto", collapsed && "mx-auto")}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          </Button>
        </div>

        {/* Quick Actions */}
        {!collapsed && (
          <div className="p-4 space-y-2">
            <Button asChild className="w-full justify-start">
              <Link href="/documents/new">
                <Plus className="h-4 w-4 mr-2" />
                New Document
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/chat">
                <MessageCircle className="h-4 w-4 mr-2" />
                Start Chat
              </Link>
            </Button>
          </div>
        )}

        <Separator />

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Button
                  key={item.name}
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    collapsed ? "px-2" : "px-3",
                    isActive && "bg-gray-200 dark:bg-gray-700"
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    {!collapsed && <span className="ml-2">{item.name}</span>}
                  </Link>
                </Button>
              );
            })}
          </div>
        </ScrollArea>

        <Separator />

        {/* User Profile */}
        <div className="p-4">
          <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8"
                }
              }}
            />
            {!collapsed && (
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                Profile
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {collapsed && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setCollapsed(false)} />
      )}
    </>
  );
}