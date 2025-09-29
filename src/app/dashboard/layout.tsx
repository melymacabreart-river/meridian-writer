import { Sidebar } from '@/components/sidebar';
import { InstallPrompt } from '@/components/install-prompt';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
      <InstallPrompt />
    </div>
  );
}