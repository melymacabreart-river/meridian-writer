import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Writer & Companion",
  description: "Your personal AI writing assistant and companion",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AI Writer",
  },
};

// Separate viewport configuration to avoid build issues
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: 'no',
  themeColor: '#000000',
};

import { AuthGuard } from '@/components/auth-guard';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // Validate Clerk key format - should start with pk_test_ or pk_live_
  const isValidClerkKey = publishableKey && 
    (publishableKey.startsWith('pk_test_') || publishableKey.startsWith('pk_live_')) &&
    publishableKey.length > 20; // Basic length check

  if (isValidClerkKey) {
    return (
      <ClerkProvider publishableKey={publishableKey}>
        <html lang="en">
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          >
            <AuthGuard>{children}</AuthGuard>
          </body>
        </html>
      </ClerkProvider>
    );
  }

  // Simple password protection when Clerk is not configured or invalid
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
