import { useState, useRef, useEffect } from 'react';
import type { AgentInfo, ToolAnimation } from '@claude-alive/core';
import { useNow } from '../hooks/useNow';

const STATE_CONFIG: Record<string, { color: string; label: string; animation?: string }> = {
  spawning: { color: 'var(--accent-purple)', label: 'spawning', animation: 'pulse 1s infinite' },
  idle: { color: 'var(--text-secondary)', label: 'idle' },
  listening: { color: 'var(--accent-blue)', label: 'listening', animation: 'pulse 1.5s infinite' },
  active: { color: 'var(--accent-green)', label: 'active', animation: 'pulse 0.8s infinite' },
  waiting: { color: 'var(--accent-amber)', label: 'waiting', animation: 'blink 1s infinite' },
  error: { color: 'var(--accent-red)', label: 'error', animation: 'shake 0.3s ease-in-out' },
  done: { color: 'var(--accent-green)', label: 'done' },
  despawning: { color: 'var(--accent-red)', label: 'leaving', animation: 'fadeOut 0.5s forwards' },
  removed: { color: 'var(--text-secondary)', label: 'removed' },
};

const TOOL_ANIMATION_ICONS: Record<ToolAnimation, string> = {
  typing: '\u2328',
  reading: '\uD83D\uDCD6',
  running: '\u26A1',
  searching: '\uD83D\uDD0D',
  thinking: '\uD83D\uDCAD',
};

const TOOL_ANIMATION_COLORS: Record<ToolAnimation, string> = {
  typing: 'var(--accent-blue)',
  reading: 'var(--accent-purple)',
  running: 'var(--accent-green)',
  searching: 'var(--accent-amber)',
  thinking: 'var(--text-secondary)',
};

function formatTimeSince(now: number, timestamp: number): string {
  if (!timestamp) return '';
  const seconds = Math.floor((now - timestamp) / 1000);
  if (seconds < 1) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface AgentCardProps {
  agent: AgentInfo;
  onRename?: (sessionId: string, name: string | null) => void;
}

const IDLE_CONFIG = STATE_CONFIG.idle;

export function AgentCard({ agent, onRename }: AgentCardProps) {
  const config = STATE_CONFIG[agent.state] ?? IDLE_CONFIG;
  const shortId = agent.sessionId.slice(0, 8);
  const now = useNow();
  const timeSince = formatTimeSince(now, agent.lastEventTime);
  const animation = agent.currentToolAnimation;
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(agent.displayName ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleRename = () => {
    const trimmed = nameInput.trim();
    onRename?.(agent.sessionId, trimmed || null);
    setEditing(false);
  };

  const displayLabel = agent.displayName || agent.projectName || shortId;

  return (
    <div
      className="rounded-lg p-4 border transition-all duration-300 relative overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        borderColor: agent.state === 'active' ? config.color : 'var(--border-color)',
        animation: agent.state === 'active' ? 'glow 2s ease-in-out infinite' : undefined,
      }}
    >
      {/* Header: Avatar + Name + Time */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0"
          style={{
            background: `${config.color}20`,
            color: config.color,
            animation: config.animation,
          }}
        >
          {agent.parentId ? 'S' : 'A'}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              className="text-sm font-medium w-full rounded px-1 py-0.5 outline-none"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--accent-blue)',
              }}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') { setEditing(false); setNameInput(agent.displayName ?? ''); }
              }}
              placeholder={agent.projectName || shortId}
            />
          ) : (
            <div
              className="text-sm font-medium cursor-pointer hover:underline truncate"
              style={{ color: 'var(--text-primary)' }}
              onClick={() => { setNameInput(agent.displayName ?? ''); setEditing(true); }}
              title="Click to rename"
            >
              {displayLabel}
            </div>
          )}
          <div className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
            {agent.parentId ? 'sub-agent' : 'agent'} · {shortId}
          </div>
        </div>
        {timeSince && (
          <div className="text-[10px] shrink-0" style={{ color: 'var(--text-secondary)' }}>
            {timeSince}
          </div>
        )}
      </div>

      {/* Project/folder path */}
      <div
        className="text-[11px] mb-2 px-2 py-1 rounded truncate font-mono"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
        title={agent.cwd}
      >
        {agent.cwd}
      </div>

      {/* Meta row: started at, events count, tools used */}
      <div className="flex items-center gap-3 mb-2 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
        <span title="Started at">
          {'\u23F0'} {formatTime(agent.createdAt)}
        </span>
        <span title="Total events received">
          {'\u26A1'} {agent.totalEvents ?? 0} events
        </span>
        {agent.toolsUsed && agent.toolsUsed.length > 0 && (
          <span title={`Tools: ${agent.toolsUsed.join(', ')}`}>
            {'\uD83D\uDEE0'} {agent.toolsUsed.length} tools
          </span>
        )}
      </div>

      {/* Last prompt preview */}
      {agent.lastPrompt && (
        <div
          className="text-[10px] mb-2 truncate italic"
          style={{ color: 'var(--text-secondary)' }}
          title={agent.lastPrompt}
        >
          "{agent.lastPrompt}"
        </div>
      )}

      {/* Status + Tool */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: config.color, animation: config.animation }}
          />
          <span className="text-xs font-medium" style={{ color: config.color }}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {animation && (
            <span className="text-xs" title={animation}>
              {TOOL_ANIMATION_ICONS[animation]}
            </span>
          )}
          {agent.currentTool && (
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{ background: `${config.color}15`, color: config.color }}
            >
              {agent.currentTool}
            </span>
          )}
        </div>
      </div>

      {/* Activity indicator bar at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5"
        style={{
          background: animation
            ? TOOL_ANIMATION_COLORS[animation]
            : agent.state === 'active'
              ? config.color
              : 'transparent',
          opacity: animation ? 0.8 : 0.4,
          transition: 'background 0.3s, opacity 0.3s',
        }}
      />
    </div>
  );
}
