import './globals.css';
import type { Metadata } from 'next';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'Nutrition & Weight',
  description: 'Log your weighings and what you eat.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <Nav />
          <main className="max-w-5xl w-full mx-auto px-4 py-6 flex-1">{children}</main>
          <footer className="text-center text-xs text-muted py-6">
            Tracking on, vibes high.
          </footer>
        </div>
      </body>
    </html>
  );
}
