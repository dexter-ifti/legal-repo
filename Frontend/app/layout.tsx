import './globals.css';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
const inter = { variable: 'font-sans' };
const jetbrainsMono = { variable: 'font-mono' };

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'LexFlow — Legal Document Automation',
  description:
    'Automate legal document workflows — scan, OCR, classify, and file with AI-powered precision.',
  openGraph: {
    title: 'LexFlow — Legal Document Automation',
    description:
      'Automate legal document workflows — scan, OCR, classify, and file with AI-powered precision.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
