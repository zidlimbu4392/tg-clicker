import type { Metadata, Viewport } from 'next';
import './globals.css';
import { GameProvider } from '@/lib/GameContext';
import { TabBar } from '@/components/TabBar';

export const metadata: Metadata = {
  title: 'Crypto Clicker',
  description: 'Tap to earn crypto',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async></script>
        <link rel="preload" as="image" href="/1y.png" />
        <link rel="preload" as="image" href="/2y.png" />
        <link rel="preload" as="image" href="/3y.png" />
        <link rel="preload" as="image" href="/4y.png" />
        <link rel="preload" as="image" href="/5y.png" />
        <link rel="preload" as="image" href="/6y.png" />
        <link rel="preload" as="image" href="/8y.png" />
        <link rel="preload" as="image" href="/9y.png" />
      </head>
      <body>
        <GameProvider>
          <div className="app">
            <div className="screen">
              {children}
            </div>
            <TabBar />
          </div>
        </GameProvider>
      </body>
    </html>
  );
}
