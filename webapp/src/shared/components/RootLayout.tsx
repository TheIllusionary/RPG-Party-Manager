import '../../styles/layout.css';

import type { ReactNode } from 'react';

export interface RootLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  toolbar?: ReactNode;
  padForToolbar?: boolean;
  variant?: 'default' | 'dashboard';
}

export default function RootLayout({
  children,
  header,
  toolbar,
  padForToolbar = false,
  variant = 'default',
}: RootLayoutProps) {
  const wrapperClass =
    variant === 'dashboard' ? 'app-wrapper app-wrapper--dashboard' : 'app-wrapper';

  return (
    <div className={wrapperClass}>
      {header && <div className="app-header-slot">{header}</div>}

      <main className={`app-main${padForToolbar ? ' app-main--toolbar' : ''}`}>
        <div className="main-content">{children}</div>
      </main>

      {toolbar}
    </div>
  );
}
