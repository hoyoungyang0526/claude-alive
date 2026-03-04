import { useTranslation } from 'react-i18next';

interface HeaderBarProps {
  leftPanelOpen?: boolean;
  rightPanelOpen?: boolean;
  chatOpen?: boolean;
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
  onToggleChat?: () => void;
}

export function HeaderBar({ leftPanelOpen = true, rightPanelOpen = true, chatOpen = false, onToggleLeftPanel, onToggleRightPanel, onToggleChat }: HeaderBarProps) {
  const { t, i18n } = useTranslation();
  const isKo = i18n.language?.startsWith('ko');

  const toggleLang = () => {
    i18n.changeLanguage(isKo ? 'en' : 'ko');
  };

  const iconButtonStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    background: 'transparent',
    transition: 'all 0.2s ease',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 24px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      <span
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}
      >
        claude-alive
      </span>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={toggleLang}
          style={{
            height: 32,
            padding: '0 14px',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
            color: 'var(--text-secondary)',
            background: 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          {isKo ? 'EN' : '한'}
        </button>

        {/* Left panel toggle */}
        <button
          onClick={onToggleLeftPanel}
          style={iconButtonStyle}
          aria-label={t('header.toggleLeftPanel')}
          title={t('header.toggleLeftPanel')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" />
            <rect x="1" y="1" width="5" height="14" rx="1" fill={leftPanelOpen ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>

        {/* Chat/terminal toggle */}
        <button
          onClick={onToggleChat}
          style={iconButtonStyle}
          aria-label={t('header.toggleChat')}
          title={t('header.toggleChat')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" />
            <rect x="1" y="10" width="14" height="5" rx="1" fill={chatOpen ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>

        {/* Right panel toggle */}
        <button
          onClick={onToggleRightPanel}
          style={iconButtonStyle}
          aria-label={t('header.toggleRightPanel')}
          title={t('header.toggleRightPanel')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" />
            <rect x="10" y="1" width="5" height="14" rx="1" fill={rightPanelOpen ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
