import { Component, lazy, Suspense, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { HeaderBar } from './components/HeaderBar.tsx';
import { UnifiedView } from './views/unified/UnifiedView.tsx';

const LazyGalleryPage = lazy(() =>
  import('./views/gallery/GalleryPage.tsx').then(m => ({ default: m.GalleryPage }))
);

type Page = 'dashboard' | 'gallery';

function useHashRoute(): [Page, (p: Page) => void] {
  const read = (): Page => {
    const h = window.location.hash.slice(1);
    return h === 'gallery' ? 'gallery' : 'dashboard';
  };

  const [page, setPage] = useState<Page>(read);

  useEffect(() => {
    const handler = () => setPage(read());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((p: Page) => {
    window.location.hash = p === 'dashboard' ? '' : p;
  }, []);

  return [page, navigate];
}

class SilentErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? null : this.props.children; }
}

export default function App() {
  const [page, navigate] = useHashRoute();

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <HeaderBar currentPage={page} onNavigate={navigate} />
      <div style={{ paddingTop: 44, height: '100%', boxSizing: 'border-box' }}>
        {page === 'dashboard' && (
          <SilentErrorBoundary>
            <UnifiedView />
          </SilentErrorBoundary>
        )}
        {page === 'gallery' && (
          <Suspense fallback={null}>
            <LazyGalleryPage />
          </Suspense>
        )}
      </div>
    </div>
  );
}
