import { Spin } from 'antd';
import type { ReactNode } from 'react';
import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { matchLegalPage, type LegalPageKey } from './legal-routes';

const AboutPage = lazy(() =>
  import('./pages/about-page').then(({ AboutPage }) => ({ default: AboutPage })),
);
const PrivacyPage = lazy(() =>
  import('./pages/privacy-page').then(({ PrivacyPage }) => ({ default: PrivacyPage })),
);
const TermsPage = lazy(() =>
  import('./pages/terms-page').then(({ TermsPage }) => ({ default: TermsPage })),
);

const PAGES: Record<LegalPageKey, () => ReactNode> = {
  about: () => <AboutPage />,
  privacy: () => <PrivacyPage />,
  terms: () => <TermsPage />,
};

/**
 * Renders the public legal pages without going through Auth0, so they stay reachable for
 * signed-out visitors and OAuth reviewers. Every other path falls through to `children`.
 */
export function LegalPageSwitch({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const page = matchLegalPage(pathname);

  if (!page) {
    return children;
  }

  return <Suspense fallback={<Spin fullscreen />}>{PAGES[page]()}</Suspense>;
}
