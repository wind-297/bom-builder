import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Robotics BOM Builder',
  description: 'Automated Bill of Materials generator for Robotics clubs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
