import { useRef, useEffect, useState, useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import type { WSServerMessage } from '@claude-alive/core';
import { TerminalTabBar } from './TerminalTabBar.tsx';
import type { Tab } from './TerminalTabBar.tsx';

export type TerminalEventHandler = (msg: WSServerMessage) => void;

interface ChatOverlayProps {
  open: boolean;
  onToggle: () => void;
  onSpawn?: (tabId: string, cwd?: string, skipPermissions?: boolean) => void;
  onInput?: (tabId: string, data: string) => void;
  onResize?: (tabId: string, cols: number, rows: number) => void;
  onClose?: (tabId: string) => void;
  terminalEventRef?: MutableRefObject<TerminalEventHandler | null>;
  projectPaths?: string[];
}

const TERM_OPTIONS = {
  fontFamily: 'SF Mono, Monaco, Menlo, monospace',
  fontSize: 13,
  lineHeight: 1.4,
  theme: {
    background: 'transparent',
    foreground: '#c9d1d9',
    cursor: '#58a6ff',
    cursorAccent: '#0d1117',
    selectionBackground: 'rgba(88, 166, 255, 0.3)',
    black: '#0d1117',
    red: '#ff7b72',
    green: '#7ee787',
    yellow: '#d29922',
    blue: '#58a6ff',
    magenta: '#bc8cff',
    cyan: '#39d353',
    white: '#c9d1d9',
    brightBlack: '#484f58',
    brightRed: '#ffa198',
    brightGreen: '#7ee787',
    brightYellow: '#e3b341',
    brightBlue: '#79c0ff',
    brightMagenta: '#d2a8ff',
    brightCyan: '#56d364',
    brightWhite: '#f0f6fc',
  },
  cursorBlink: true,
  cursorStyle: 'block' as const,
  allowTransparency: true,
  scrollback: 5000,
};

let tabCounter = 0;

function makeTabId(): string {
  return `tab-${++tabCounter}`;
}

function pathBasename(p: string): string {
  return p.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? p;
}

export function ChatOverlay({ open, onToggle, onSpawn, onInput, onResize, onClose, terminalEventRef, projectPaths = [] }: ChatOverlayProps) {
  const { t } = useTranslation();

  // Stable refs for callbacks — prevents useEffect re-runs on callback reference changes
  const onSpawnRef = useRef(onSpawn);
  const onInputRef = useRef(onInput);
  const onResizeRef = useRef(onResize);
  const onCloseRef = useRef(onClose);
  onSpawnRef.current = onSpawn;
  onInputRef.current = onInput;
  onResizeRef.current = onResize;
  onCloseRef.current = onClose;

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState('');
  const [cwdPickerOpen, setCwdPickerOpen] = useState(false);
  const [customPath, setCustomPath] = useState('');
  const [skipPermissions, setSkipPermissions] = useState(false);

  // Per-tab xterm instances
  const termsRef = useRef(new Map<string, { term: Terminal; fit: FitAddon }>());
  // Per-tab container divs
  const containersRef = useRef(new Map<string, HTMLDivElement>());
  // Wrapper that holds all tab containers
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Track if we've initialized on first open
  const initializedRef = useRef(false);

  // Create a new tab: allocate xterm, mount to container, call onSpawn
  const createTab = useCallback((cwd?: string, dangerousSkip?: boolean) => {
    const tabId = makeTabId();
    const label = cwd ? pathBasename(cwd) : t('terminal.tabLabel', { n: tabCounter });

    setTabs(prev => [...prev, { id: tabId, label, exited: false }]);
    setActiveTabId(tabId);

    // Defer xterm creation to next frame so the container div exists
    requestAnimationFrame(() => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;

      const container = document.createElement('div');
      container.style.flex = '1';
      container.style.padding = '8px 12px';
      container.style.overflow = 'hidden';
      container.style.height = '100%';
      wrapper.appendChild(container);
      containersRef.current.set(tabId, container);

      const term = new Terminal(TERM_OPTIONS);
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(container);
      termsRef.current.set(tabId, { term, fit });

      requestAnimationFrame(() => {
        fit.fit();
        onResizeRef.current?.(tabId, term.cols, term.rows);
        term.focus();
      });

      term.onData((data) => {
        onInputRef.current?.(tabId, data);
      });

      onSpawnRef.current?.(tabId, cwd, dangerousSkip);
    });

    return tabId;
  }, [t]);

  const handleAddClick = useCallback(() => {
    setCwdPickerOpen(true);
    setCustomPath('');
  }, []);

  const handlePickCwd = useCallback((cwd?: string) => {
    const skip = skipPermissions;
    setCwdPickerOpen(false);
    setCustomPath('');
    setSkipPermissions(false);
    createTab(cwd, skip);
  }, [createTab, skipPermissions]);

  // Close a tab: dispose xterm, remove container, call onClose
  const closeTab = useCallback((tabId: string) => {
    const entry = termsRef.current.get(tabId);
    if (entry) {
      entry.term.dispose();
      termsRef.current.delete(tabId);
    }
    const container = containersRef.current.get(tabId);
    if (container) {
      container.remove();
      containersRef.current.delete(tabId);
    }
    onCloseRef.current?.(tabId);

    setTabs(prev => {
      const next = prev.filter(tab => tab.id !== tabId);
      if (next.length === 0) return next;
      return next;
    });

    setActiveTabId(prev => {
      if (prev !== tabId) return prev;
      // Switch to the last remaining tab
      const remaining = [...termsRef.current.keys()].filter(id => id !== tabId);
      return remaining.length > 0 ? remaining[remaining.length - 1]! : '';
    });
  }, []);

  // When active tab changes, show/hide containers and fit
  useEffect(() => {
    for (const [id, container] of containersRef.current) {
      container.style.display = id === activeTabId ? 'block' : 'none';
    }
    const entry = termsRef.current.get(activeTabId);
    if (entry) {
      requestAnimationFrame(() => {
        entry.fit.fit();
        entry.term.focus();
      });
    }
  }, [activeTabId]);

  // ResizeObserver for the wrapper — fit the active tab
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const ro = new ResizeObserver(() => {
      const entry = termsRef.current.get(activeTabId);
      if (entry) {
        entry.fit.fit();
        onResizeRef.current?.(activeTabId, entry.term.cols, entry.term.rows);
      }
    });
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [activeTabId]);

  // Initialize first tab when overlay opens — show picker instead of auto-creating
  useEffect(() => {
    if (open && !initializedRef.current) {
      initializedRef.current = true;
      setCwdPickerOpen(true);
    }
  }, [open]);

  // Focus active terminal when overlay opens
  useEffect(() => {
    if (open && !cwdPickerOpen) {
      setTimeout(() => {
        termsRef.current.get(activeTabId)?.term.focus();
      }, 100);
    }
  }, [open, activeTabId, cwdPickerOpen]);

  // Register terminal event handler for incoming server messages
  useEffect(() => {
    if (!terminalEventRef) return;
    terminalEventRef.current = (msg: WSServerMessage) => {
      if (msg.type === 'terminal:output') {
        termsRef.current.get(msg.tabId)?.term.write(msg.data);
      } else if (msg.type === 'terminal:exited') {
        setTabs(prev => prev.map(tab =>
          tab.id === msg.tabId ? { ...tab, exited: true } : tab
        ));
      }
    };
    return () => { terminalEventRef.current = null; };
  }, [terminalEventRef]);

  // Cleanup all terminals on unmount
  useEffect(() => {
    return () => {
      for (const { term } of termsRef.current.values()) term.dispose();
      termsRef.current.clear();
      containersRef.current.clear();
      initializedRef.current = false;
    };
  }, []);

  if (!open) return null;

  const uniquePaths = [...new Set(projectPaths)];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(640px, 90vw)',
        height: '45vh',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(13, 17, 23, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--border-color)',
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            letterSpacing: '0.05em',
          }}
        >
          ■ {t('chat.title')}
        </span>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 14,
            padding: '2px 6px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Tab bar */}
      <TerminalTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={setActiveTabId}
        onAdd={handleAddClick}
        onClose={closeTab}
      />

      {/* CWD Picker overlay */}
      {cwdPickerOpen && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.6)',
          }}
          onClick={() => { if (tabs.length > 0) setCwdPickerOpen(false); }}
        >
          <div
            style={{
              width: 320,
              maxHeight: '80%',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 12,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Picker header */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-color)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {t('terminal.selectWorkingDir')}
            </div>

            {/* Project list */}
            {uniquePaths.length > 0 && (
              <div style={{ overflowY: 'auto', maxHeight: 200 }}>
                {uniquePaths.map((cwd) => (
                  <button
                    key={cwd}
                    onClick={() => handlePickCwd(cwd)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s ease',
                      color: 'var(--text-primary)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ fontSize: 14 }}>📁</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {pathBasename(cwd)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cwd}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Custom path input */}
            <div style={{ padding: '10px 16px', borderTop: uniquePaths.length > 0 ? '1px solid var(--border-color)' : 'none' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePickCwd(customPath.trim() || undefined);
                }}
              >
                <input
                  type="text"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder={t('terminal.customPathPlaceholder')}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent-blue)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; }}
                />
              </form>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.5, marginTop: 6 }}>
                {t('terminal.customPathHint')}
              </div>
            </div>

            {/* Skip permissions toggle */}
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                  color: skipPermissions ? 'var(--accent-orange, #d29922)' : 'var(--text-secondary)',
                }}
              >
                <input
                  type="checkbox"
                  checked={skipPermissions}
                  onChange={(e) => setSkipPermissions(e.target.checked)}
                  style={{ accentColor: 'var(--accent-orange, #d29922)' }}
                />
                {t('terminal.skipPermissions')}
              </label>
              {skipPermissions && (
                <div style={{ fontSize: 11, color: 'var(--accent-orange, #d29922)', opacity: 0.7, marginTop: 4 }}>
                  {t('terminal.skipPermissionsWarning')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Terminal containers wrapper */}
      <div
        ref={wrapperRef}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      />
    </div>
  );
}
