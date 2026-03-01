import { useTranslation } from 'react-i18next';

type Page = 'dashboard' | 'gallery';

interface HeaderBarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function HeaderBar({ currentPage, onNavigate }: HeaderBarProps) {
  const { t, i18n } = useTranslation();
  const isKo = i18n.language?.startsWith('ko');

  const toggleLang = () => {
    i18n.changeLanguage(isKo ? 'en' : 'ko');
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    height: 28,
    padding: '0 12px',
    border: 'none',
    borderBottom: active ? '2px solid var(--accent-purple)' : '2px solid transparent',
    borderRadius: 0,
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    fontFamily: 'inherit',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    background: 'transparent',
    transition: 'color 0.15s, border-color 0.15s',
  });

  const btnStyle: React.CSSProperties = {
    height: 28,
    padding: '0 10px',
    border: '1px solid var(--border-color)',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: 'inherit',
    color: 'var(--text-secondary)',
    background: 'transparent',
    transition: 'background 0.15s',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '0 20px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          marginRight: 16,
        }}
      >
        claude-alive
      </span>

      <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button onClick={() => onNavigate('dashboard')} style={tabStyle(currentPage === 'dashboard')}>
          {t('header.title')}
        </button>
        <button onClick={() => onNavigate('gallery')} style={tabStyle(currentPage === 'gallery')}>
          {t('gallery.title')}
        </button>
      </nav>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={toggleLang} style={btnStyle}>
          {isKo ? 'EN' : '\ud55c'}
        </button>
      </div>
    </div>
  );
}
