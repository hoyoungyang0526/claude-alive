import { Component, lazy, Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import i18n from '@claude-alive/i18n';
import { HeaderBar } from './components/HeaderBar.tsx';

const PixelOfficePage = lazy(() =>
  import('./views/pixel/PixelOfficePage.tsx').then(m => ({ default: m.PixelOfficePage })),
);

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state: { hasError: boolean; error: Error | null } = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[claude-alive] UI error:', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#e5534b', fontFamily: 'monospace', textAlign: 'center' }}>
          <p>{i18n.t('error.somethingWentWrong')}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 12, padding: '6px 16px', cursor: 'pointer' }}
          >
            {i18n.t('error.retry')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <HeaderBar
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        chatOpen={chatOpen}
        onToggleLeftPanel={() => setLeftPanelOpen(prev => !prev)}
        onToggleRightPanel={() => setRightPanelOpen(prev => !prev)}
        onToggleChat={() => setChatOpen(prev => !prev)}
      />
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', marginTop: 56 }}>
        <ErrorBoundary>
          <Suspense fallback={null}>
            <PixelOfficePage leftPanelOpen={leftPanelOpen} rightPanelOpen={rightPanelOpen} chatOpen={chatOpen} onChatOpenChange={setChatOpen} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
