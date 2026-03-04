import { useTranslation } from 'react-i18next';

export interface Tab {
  id: string;
  label: string;
  exited: boolean;
}

interface TerminalTabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onSelect: (tabId: string) => void;
  onAdd: () => void;
  onClose: (tabId: string) => void;
}

export function TerminalTabBar({ tabs, activeTabId, onSelect, onAdd, onClose }: TerminalTabBarProps) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '4px 8px',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
        overflowX: 'auto',
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: tab.id === activeTabId ? 'rgba(88, 166, 255, 0.12)' : 'transparent',
            border: 'none',
            borderRadius: 6,
            color: tab.id === activeTabId ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            whiteSpace: 'nowrap',
            transition: 'background 0.15s ease',
          }}
        >
          <span style={{ opacity: tab.exited ? 0.5 : 1 }}>
            {tab.label}
            {tab.exited && ` (${t('terminal.exited')})`}
          </span>
          {tabs.length > 1 && (
            <span
              onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
              style={{
                fontSize: 10,
                lineHeight: 1,
                padding: '1px 3px',
                borderRadius: 3,
                opacity: 0.5,
                cursor: 'pointer',
              }}
            >
              ✕
            </span>
          )}
        </button>
      ))}
      <button
        onClick={onAdd}
        title={t('terminal.newTab')}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          background: 'transparent',
          border: 'none',
          borderRadius: 6,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
          lineHeight: 1,
          flexShrink: 0,
          transition: 'background 0.15s ease',
        }}
      >
        +
      </button>
    </div>
  );
}
