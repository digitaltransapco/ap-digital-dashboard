import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['500'],
});

export const metadata: Metadata = {
  title: 'AP Circle Digital Transactions Dashboard',
  description: 'Tracks cumulative MTD booking-counter transactions across all offices in AP Postal Circle, visualising Manual vs Digital split.',
  openGraph: {
    title: 'AP Circle Digital Transactions Dashboard',
    description: 'Live digital adoption tracker for Andhra Pradesh Postal Circle',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AP Circle Digital Transactions Dashboard',
    description: 'Live digital adoption tracker for Andhra Pradesh Postal Circle',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased font-sans">
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
