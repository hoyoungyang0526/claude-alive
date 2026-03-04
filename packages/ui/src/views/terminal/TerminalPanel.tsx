import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useTerminalWS } from './useTerminalWS.ts';

interface TerminalTab {
  id: string;
  terminal: Terminal;
  fitAddon: FitAddon;
}

interface TerminalPanelProps {
  open: boolean;
  onToggle: () => void;
  height: number;
  onHeightChange: (h: number) => void;
}

export function TerminalPanel({ open, onToggle, height, onHeightChange }: TerminalPanelProps) {
  const { t } = useTranslation();
  const [tabs, setTabs] = useState<TerminalTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const tabsRef = useRef<TerminalTab[]>([]);
  tabsRef.current = tabs;
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);
  const pendingTerminal = useRef<Terminal | null>(null);

  const ws = useTerminalWS({
    onCreated: (sessionId) => {
      const terminal = pendingTerminal.current;
      if (!terminal) return;
      pendingTerminal.current = null;

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);

      const tab: TerminalTab = { id: sessionId, terminal, fitAddon };

      setTabs(prev => [...prev, tab]);
      setActiveTabId(sessionId);

      // Mount terminal after React render
      requestAnimationFrame(() => {
        const el = document.getElementById(`terminal-${sessionId}`);
        if (el) {
          terminal.open(el);
          fitAddon.fit();
          ws.resize(sessionId, terminal.cols, terminal.rows);
        }
      });

      terminal.onData((data) => ws.sendInput(sessionId, data));
      terminal.onResize(({ cols, rows }) => ws.resize(sessionId, cols, rows));
    },
    onOutput: (sessionId, data) => {
      const tab = tabsRef.current.find(t => t.id === sessionId);
      tab?.terminal.write(data);
    },
    onExited: (sessionId) => {
      const tab = tabsRef.current.find(t => t.id === sessionId);
      if (tab) {
        tab.terminal.write('\r\n\x1b[90m[Process exited]\x1b[0m\r\n');
      }
    },
    onError: () => {
      pendingTerminal.current?.dispose();
      pendingTerminal.current = null;
    },
  });

  const createTab = useCallback(() => {
    const terminal = new Terminal({
      theme: {
        background: '#0d1117',
        foreground: '#f0f6fc',
        cursor: '#58a6ff',
        selectionBackground: '#264f78',
      },
      fontFamily: 'SF Mono, Fira Code, JetBrains Mono, monospace',
      fontSize: 13,
      cursorBlink: true,
    });
    pendingTerminal.current = terminal;
    ws.createSession();
  }, [ws]);

  const closeTab = useCallback((tabId: string) => {
    const tab = tabsRef.current.find(t => t.id === tabId);
    if (tab) {
      tab.terminal.dispose();
      ws.destroySession(tab.id);
    }
    setTabs(prev => {
      const next = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(next.length > 0 ? next[next.length - 1]!.id : null);
      }
      return next;
    });
  }, [activeTabId, ws]);

  // Drag to resize
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startH: height };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startY - me.clientY;
      const newH = Math.max(150, Math.min(window.innerHeight * 0.6, dragRef.current.startH + delta));
      onHeightChange(newH);
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      // Refit all terminals
      tabsRef.current.forEach(tab => {
        try { tab.fitAddon.fit(); } catch { /* ignore */ }
      });
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [height, onHeightChange]);

  // Auto-create first tab
  useEffect(() => {
    if (open && tabs.length === 0) {
      createTab();
    }
  }, [open, tabs.length, createTab]);

  // Refit on height change
  useEffect(() => {
    if (!open) return;
    const activeTab = tabs.find(t => t.id === activeTabId);
    if (activeTab) {
      requestAnimationFrame(() => {
        try { activeTab.fitAddon.fit(); } catch { /* ignore */ }
      });
    }
  }, [height, activeTabId, open, tabs]);

  if (!open) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 px-4 py-2 rounded-lg text-[13px] font-medium z-50 hover:brightness-110 transition-all"
        style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
      >
        &gt;_ {t('terminal.title')}
      </button>
    );
  }

  return (
    <div
      style={{ height, background: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)' }}
      className="flex flex-col shrink-0"
    >
      {/* Drag handle */}
      <div
        className="h-1.5 cursor-row-resize hover:bg-blue-500/30 transition-colors"
        onMouseDown={onDragStart}
        style={{ background: 'var(--border-color)' }}
      />

      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-3 py-1.5 shrink-0"
        style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] transition-colors"
            style={{
              background: activeTabId === tab.id ? 'var(--bg-card)' : 'transparent',
              color: activeTabId === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {t('terminal.title')} {i + 1}
            <span
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              className="ml-1 hover:text-red-400 cursor-pointer text-[10px]"
            >
              ✕
            </span>
          </button>
        ))}
        <button
          onClick={createTab}
          className="px-2 py-1 rounded-md text-[12px] hover:bg-white/5 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          + {t('terminal.newTab')}
        </button>
        <div className="flex-1" />
        <button
          onClick={onToggle}
          className="px-2 py-1 text-[11px] hover:bg-white/5 rounded transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('terminal.close')}
        </button>
      </div>

      {/* Terminal containers */}
      <div className="flex-1 relative min-h-0">
        {tabs.map(tab => (
          <div
            key={tab.id}
            id={`terminal-${tab.id}`}
            className="absolute inset-0 p-1"
            style={{ display: activeTabId === tab.id ? 'block' : 'none' }}
          />
        ))}
      </div>
    </div>
  );
}
