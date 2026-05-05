import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'L3modz',
  description: 'Bike parts marketplace and admin dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
