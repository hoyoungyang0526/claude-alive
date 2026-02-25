import type { AgentInfo } from '@claude-alive/core';

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

interface AgentCardProps {
  agent: AgentInfo;
}

export function AgentCard({ agent }: AgentCardProps) {
  const config = STATE_CONFIG[agent.state] ?? STATE_CONFIG.idle!;
  const shortId = agent.sessionId.slice(0, 8);

  return (
    <div
      className="rounded-lg p-4 border transition-all duration-300"
      style={{
        background: 'var(--bg-card)',
        borderColor: agent.state === 'active' ? config.color : 'var(--border-color)',
        boxShadow: agent.state === 'active' ? `0 0 12px ${config.color}33` : 'none',
      }}
    >
      {/* Avatar */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
          style={{
            background: `${config.color}20`,
            color: config.color,
            animation: config.animation,
          }}
        >
          {agent.parentId ? 'S' : 'A'}
        </div>
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {agent.parentId ? 'Sub-agent' : 'Agent'} {shortId}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {agent.cwd.split('/').pop() || agent.cwd}
          </div>
        </div>
      </div>

      {/* Status */}
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
  );
}
