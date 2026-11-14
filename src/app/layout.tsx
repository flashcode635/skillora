import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Skillora — Your code. Your next opportunity.', description: 'Discover skills backed by your public GitHub repositories. A clear first step toward your next opportunity. No sign-up required.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body suppressHydrationWarning>{children}</body></html>;
}
