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

type TerminalMode = 'popup' | 'bottom' | 'right' | 'fullscreen';

const MIN_BOTTOM_HEIGHT = 150;
const MAX_BOTTOM_RATIO = 0.85; // 85% of viewport height
const MIN_RIGHT_WIDTH = 200;
const MAX_RIGHT_RATIO = 0.75; // 75% of viewport width

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

const API_BASE = `${window.location.protocol}//${window.location.hostname}:${window.location.port || '3141'}`;

const HEADER_HEIGHT = 56;

function getModeStyle(mode: TerminalMode, bottomHeight?: number, rightWidth?: number): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'fixed',
    zIndex: 30,
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(13, 17, 23, 0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    transition: 'all 250ms ease',
  };

  switch (mode) {
    case 'popup':
      return {
        ...base,
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(640px, 90vw)',
        height: '45vh',
        borderRadius: 16,
      };
    case 'bottom':
      return {
        ...base,
        bottom: 0,
        left: 0,
        right: 0,
        height: bottomHeight ?? '50vh',
        borderRadius: 0,
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: 'none',
      };
    case 'right':
      return {
        ...base,
        top: HEADER_HEIGHT,
        right: 0,
        bottom: 0,
        width: rightWidth ?? 'min(480px, 40vw)',
        borderRadius: 0,
        borderRight: 'none',
        borderTop: 'none',
        borderBottom: 'none',
      };
    case 'fullscreen':
      return {
        ...base,
        top: HEADER_HEIGHT,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 0,
        border: 'none',
        borderTop: '1px solid var(--border-color)',
      };
  }
}

let tabCounter = 0;

function makeTabId(): string {
  return `tab-${++tabCounter}`;
}

function pathBasename(p: string): string {
  return p.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? p;
}

// Mode button SVG icons
function ModeIcon({ mode, size = 14 }: { mode: TerminalMode; size?: number }) {
  const s = size;
  switch (mode) {
    case 'popup':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <rect x="3" y="4" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case 'bottom':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" />
          <rect x="1" y="8" width="14" height="7" rx="1" fill="currentColor" opacity="0.4" />
        </svg>
      );
    case 'right':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" />
          <rect x="9" y="1" width="6" height="14" rx="1" fill="currentColor" opacity="0.4" />
        </svg>
      );
    case 'fullscreen':
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="14" height="14" rx="2" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
  }
}

const MODES: TerminalMode[] = ['popup', 'bottom', 'right', 'fullscreen'];
const MODE_I18N: Record<TerminalMode, string> = {
  popup: 'terminal.modePopup',
  bottom: 'terminal.modeBottom',
  right: 'terminal.modeRight',
  fullscreen: 'terminal.modeFullscreen',
};

export function ChatOverlay({ open, onToggle, onSpawn, onInput, onResize, onClose, terminalEventRef, projectPaths = [] }: ChatOverlayProps) {
  const { t } = useTranslation();

  const [mode, setMode] = useState<TerminalMode>('popup');
  const [bottomHeight, setBottomHeight] = useState<number | undefined>(undefined);
  const [rightWidth, setRightWidth] = useState<number | undefined>(undefined);
  const resizingRef = useRef<'bottom' | 'right' | null>(null);

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
  const [skipPermissions, setSkipPermissions] = useState(true);
  const [_browsePath, setBrowsePath] = useState('~');
  const [browseDirs, setBrowseDirs] = useState<{ name: string; path: string }[]>([]);
  const [browseCurrentPath, setBrowseCurrentPath] = useState('');
  const [browseLoading, setBrowseLoading] = useState(false);

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

  const fetchBrowse = useCallback((dir: string) => {
    setBrowseLoading(true);
    fetch(`${API_BASE}/api/fs/browse?dir=${encodeURIComponent(dir)}`)
      .then(r => r.json())
      .then((data: { path: string; dirs: { name: string; path: string }[] }) => {
        setBrowseCurrentPath(data.path);
        setBrowseDirs(data.dirs);
        setBrowsePath(data.path);
      })
      .catch(() => {})
      .finally(() => setBrowseLoading(false));
  }, []);

  const handleAddClick = useCallback(() => {
    setCwdPickerOpen(true);
    setCustomPath('');
    fetchBrowse('~');
  }, [fetchBrowse]);

  const handlePickCwd = useCallback((cwd?: string) => {
    const skip = skipPermissions;
    setCwdPickerOpen(false);
    setCustomPath('');
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

  // Re-fit terminals when mode changes (container size changes)
  useEffect(() => {
    const entry = termsRef.current.get(activeTabId);
    if (entry) {
      // Delay to let CSS transition settle
      const timer = setTimeout(() => {
        entry.fit.fit();
        onResizeRef.current?.(activeTabId, entry.term.cols, entry.term.rows);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [mode, activeTabId]);

  // Initialize first tab when overlay opens — show picker instead of auto-creating
  useEffect(() => {
    if (open && !initializedRef.current) {
      initializedRef.current = true;
      setCwdPickerOpen(true);
      fetchBrowse('~');
    }
  }, [open, fetchBrowse]);

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

  // Resize drag handler
  const handleResizeStart = useCallback((edge: 'bottom' | 'right') => {
    resizingRef.current = edge;
    document.body.style.cursor = edge === 'bottom' ? 'row-resize' : 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (e: MouseEvent) => {
      if (resizingRef.current === 'bottom') {
        const h = Math.min(
          Math.max(window.innerHeight - e.clientY, MIN_BOTTOM_HEIGHT),
          window.innerHeight * MAX_BOTTOM_RATIO,
        );
        setBottomHeight(h);
      } else if (resizingRef.current === 'right') {
        const w = Math.min(
          Math.max(window.innerWidth - e.clientX, MIN_RIGHT_WIDTH),
          window.innerWidth * MAX_RIGHT_RATIO,
        );
        setRightWidth(w);
      }
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  // Cleanup all terminals on unmount
  useEffect(() => {
    return () => {
      for (const { term } of termsRef.current.values()) term.dispose();
      termsRef.current.clear();
      containersRef.current.clear();
      initializedRef.current = false;
    };
  }, []);

  // Re-fit terminal when expanding from collapsed state
  useEffect(() => {
    if (open && activeTabId) {
      const entry = termsRef.current.get(activeTabId);
      if (entry) {
        requestAnimationFrame(() => {
          entry.fit.fit();
          entry.term.focus();
        });
      }
    }
  }, [open, activeTabId]);

  const uniquePaths = [...new Set(projectPaths)];
  const hasTabs = tabs.length > 0;

  if (!open && !hasTabs) return null;

  return (
    <>
      {/* Collapsed minimized bar — shown when terminal has tabs but is closed */}
      {!open && hasTabs && (
        <button
          onClick={onToggle}
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            background: 'rgba(13, 17, 23, 0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid var(--border-color)',
            borderRadius: 10,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: 13 }}>▣</span>
          <span>{t('chat.title')}</span>
          <span style={{
            background: 'rgba(88, 166, 255, 0.2)',
            color: 'var(--accent-blue)',
            borderRadius: 8,
            padding: '1px 6px',
            fontSize: 10,
            fontWeight: 600,
          }}>
            {tabs.length}
          </span>
          <span style={{ fontSize: 10, opacity: 0.5 }}>▲</span>
        </button>
      )}

      {/* Always render overlay to preserve xterm DOM — hide with CSS when closed */}
      <div style={{
        ...getModeStyle(mode, bottomHeight, rightWidth),
        ...(open ? {} : { display: 'none' }),
        ...(resizingRef.current ? { transition: 'none' } : {}),
      }}>
      {/* Resize handle */}
      {mode === 'bottom' && (
        <div
          onMouseDown={() => handleResizeStart('bottom')}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            cursor: 'row-resize',
            zIndex: 50,
          }}
        />
      )}
      {mode === 'right' && (
        <div
          onMouseDown={() => handleResizeStart('right')}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: 6,
            cursor: 'col-resize',
            zIndex: 50,
          }}
        />
      )}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Mode toggle buttons */}
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              title={t(MODE_I18N[m])}
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: mode === m ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: 6,
                color: mode === m ? 'var(--accent-blue)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                opacity: mode === m ? 1 : 0.6,
              }}
            >
              <ModeIcon mode={m} />
            </button>
          ))}

          <div style={{ width: 1, height: 16, background: 'var(--border-color)', margin: '0 6px' }} />

          {/* Collapse button (minimize) */}
          <button
            onClick={onToggle}
            title={t('terminal.collapse')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              padding: '2px 6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            ▼
          </button>
        </div>
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
              width: 380,
              maxHeight: '85%',
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

            {/* Active project shortcuts */}
            {uniquePaths.length > 0 && (
              <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ padding: '8px 16px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('agents.projects')}
                </div>
                <div style={{ overflowY: 'auto', maxHeight: 120 }}>
                  {uniquePaths.map((cwd) => (
                    <button
                      key={cwd}
                      onClick={() => handlePickCwd(cwd)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '7px 16px',
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
                      <span style={{ fontSize: 12, opacity: 0.6 }}>&#9733;</span>
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{pathBasename(cwd)}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.4, marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>{cwd}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Folder browser */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {/* Current path bar + select button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--border-color)' }}>
                {browseCurrentPath !== '/' && (
                  <button
                    onClick={() => {
                      const parent = browseCurrentPath.replace(/\/[^/]+\/?$/, '') || '/';
                      fetchBrowse(parent);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: 14,
                      padding: '2px 6px',
                      flexShrink: 0,
                    }}
                    title="Parent directory"
                  >
                    &#8592;
                  </button>
                )}
                <div style={{
                  flex: 1,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  direction: 'rtl',
                  textAlign: 'left',
                }}>
                  <span dir="ltr">{browseCurrentPath}</span>
                </div>
                <button
                  onClick={() => handlePickCwd(browseCurrentPath)}
                  style={{
                    padding: '4px 12px',
                    fontSize: 11,
                    fontWeight: 600,
                    background: 'var(--accent-blue)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {t('terminal.selectHere')}
                </button>
              </div>

              {/* Directory listing */}
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, maxHeight: 200 }}>
                {browseLoading ? (
                  <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>...</div>
                ) : browseDirs.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', opacity: 0.5 }}>
                    {t('terminal.emptyDir')}
                  </div>
                ) : (
                  browseDirs.map((dir) => (
                    <button
                      key={dir.path}
                      onClick={() => fetchBrowse(dir.path)}
                      onDoubleClick={() => handlePickCwd(dir.path)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 16px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ opacity: 0.5, fontSize: 11 }}>&#128193;</span>
                      <span>{dir.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Manual path input */}
            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-color)' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = customPath.trim();
                  if (val) handlePickCwd(val);
                }}
              >
                <input
                  type="text"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder={t('terminal.customPathPlaceholder')}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    color: 'var(--text-primary)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--accent-blue)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--border-color)'; }}
                />
              </form>
            </div>

            {/* Skip permissions toggle */}
            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-color)' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 11,
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
    </>
  );
}
