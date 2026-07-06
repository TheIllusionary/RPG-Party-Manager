import './AppNavBar.css';

import { ChevronRight, Home } from 'lucide-react';
import type { ReactNode } from 'react';

export interface AppNavCrumb {
  label: string;
  onClick?: () => void;
}

export interface AppNavBarProps {
  title: string;
  crumbs?: AppNavCrumb[];
  actions?: ReactNode;
}

export default function AppNavBar({ title, crumbs = [], actions }: AppNavBarProps) {
  return (
    <header className="app-nav-bar">
      <div className="app-shell-header-inner">
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="app-button-row app-nav-breadcrumbs">
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="app-nav-crumb">
                {index > 0 && <ChevronRight className="icon-sm app-nav-chevron" aria-hidden />}
                {crumb.onClick ? (
                  <button type="button" className="app-btn app-nav-crumb-btn" onClick={crumb.onClick}>
                    {index === 0 && <Home className="icon-sm" aria-hidden />}
                    {crumb.label}
                  </button>
                ) : (
                  <span className="app-nav-crumb-label">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="app-nav-title-block">
          <h1 className="app-page-title">{title}</h1>
          {actions && <div className="app-button-row">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
