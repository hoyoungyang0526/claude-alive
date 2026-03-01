import { useRef, useEffect, useMemo } from 'react';
import type { AgentInfo, EventLogEntry } from '@claude-alive/core';

export interface PromptEntry {
  sessionId: string;
  text: string;
  timestamp: number;
}

interface AgentTimelinePanelProps {
  agent: AgentInfo;
  events: EventLogEntry[];
  prompts: PromptEntry[];
  onClose: () => void;
}

const STATE_COLORS: Record<string, string> = {
  spawning: '#a78bfa',
  idle: '#8888a0',
  listening: '#60a5fa',
  active: '#4ade80',
  waiting: '#fbbf24',
  error: '#f87171',
  done: '#4ade80',
  despawning: '#f87171',
};

const TOOL_ICONS: Record<string, string> = {
  Read: '\u{1F4D6}',
  Write: '\u{270F}\u{FE0F}',
  Edit: '\u{270F}\u{FE0F}',
  Bash: '\u{1F4BB}',
  Grep: '\u{1F50D}',
  Glob: '\u{1F4C2}',
  WebSearch: '\u{1F310}',
  WebFetch: '\u{1F310}',
  Agent: '\u{1F916}',
  Skill: '\u{26A1}',
};

type TimelineItem =
  | { kind: 'prompt'; text: string; timestamp: number }
  | { kind: 'event'; entry: EventLogEntry };

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function summarizeEvent(entry: EventLogEntry): string | null {
  switch (entry.event) {
    case 'SessionStart': return 'Session started';
    case 'SessionEnd': return 'Session ended';
    case 'PreToolUse': return entry.tool ? `Using ${entry.tool}` : 'Using tool';
    case 'PostToolUse': return entry.tool ? `Finished ${entry.tool}` : 'Tool finished';
    case 'PostToolUseFailure': return entry.tool ? `Failed: ${entry.tool}` : 'Tool failed';
    case 'PermissionRequest': return 'Waiting for permission';
    case 'Stop': return 'Stopped';
    case 'SubagentStart': return 'Sub-agent spawned';
    case 'SubagentStop': return 'Sub-agent stopped';
    case 'TaskCompleted': return 'Task completed';
    case 'Notification': return 'Notification';
    case 'PreCompact': return 'Context compacting';
    default: return entry.event;
  }
}

// Collapse consecutive PreToolUse+PostToolUse for same tool into one entry
function collapseEvents(items: TimelineItem[]): TimelineItem[] {
  const result: TimelineItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'event' && item.entry.event === 'PreToolUse') {
      const next = items[i + 1];
      if (next?.kind === 'event' && next.entry.event === 'PostToolUse' && next.entry.tool === item.entry.tool) {
        // Merge into single "Used X" entry
        result.push({ kind: 'event', entry: { ...next.entry, event: 'PostToolUse' } });
        i++; // skip next
        continue;
      }
    }
    result.push(item);
  }
  return result;
}

export function AgentTimelinePanel({ agent, events, prompts, onClose }: AgentTimelinePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const agentEvents = useMemo(
    () => events.filter(e => e.sessionId === agent.sessionId),
    [events, agent.sessionId],
  );

  const agentPrompts = useMemo(
    () => prompts.filter(p => p.sessionId === agent.sessionId),
    [prompts, agent.sessionId],
  );

  const timeline = useMemo(() => {
    const items: TimelineItem[] = [
      ...agentPrompts.map(p => ({ kind: 'prompt' as const, text: p.text, timestamp: p.timestamp })),
      ...agentEvents.map(e => ({ kind: 'event' as const, entry: e })),
    ];
    items.sort((a, b) => {
      const ta = a.kind === 'prompt' ? a.timestamp : a.entry.timestamp;
      const tb = b.kind === 'prompt' ? b.timestamp : b.entry.timestamp;
      return ta - tb;
    });
    return collapseEvents(items);
  }, [agentEvents, agentPrompts]);

  // Auto-scroll to bottom on new items
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [timeline.length]);

  const displayName = agent.displayName || agent.projectName || agent.sessionId.slice(0, 8);
  const stateColor = STATE_COLORS[agent.state] ?? '#8888a0';

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '45%',
      minHeight: 200,
      maxHeight: 400,
      zIndex: 15,
      background: 'rgba(10, 10, 20, 0.95)',
      borderTop: '1px solid #333348',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        borderBottom: '1px solid #2a2a3a',
        flexShrink: 0,
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: stateColor,
          boxShadow: agent.state === 'active' ? `0 0 6px ${stateColor}` : 'none',
        }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e0e0e8' }}>
          {displayName}
        </span>
        <span style={{ fontSize: 11, color: '#8888a0' }}>
          {agent.state}
        </span>
        {agent.currentTool && (
          <span style={{
            fontSize: 11,
            padding: '1px 8px',
            borderRadius: 3,
            background: `${stateColor}20`,
            color: stateColor,
          }}>
            {agent.currentTool}
          </span>
        )}
        <button
          onClick={onClose}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: '#8888a0',
            cursor: 'pointer',
            fontSize: 16,
            padding: '0 4px',
          }}
        >
          &#x2715;
        </button>
      </div>

      {/* Timeline */}
      <div ref={scrollRef} style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 16px',
      }}>
        {timeline.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#555570', fontSize: 12, paddingTop: 32 }}>
            No events yet
          </div>
        ) : (
          timeline.map((item, i) => {
            if (item.kind === 'prompt') {
              return (
                <div key={`p-${i}`} style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginBottom: 8,
                }}>
                  <div style={{
                    maxWidth: '80%',
                    padding: '8px 12px',
                    borderRadius: '12px 12px 2px 12px',
                    background: '#1a3a5c',
                    border: '1px solid #2a4a6c',
                  }}>
                    <div style={{ fontSize: 12, color: '#e0e0e8', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {item.text}
                    </div>
                    <div style={{ fontSize: 10, color: '#6688aa', marginTop: 4, textAlign: 'right' }}>
                      {formatTime(item.timestamp)}
                    </div>
                  </div>
                </div>
              );
            }

            const { entry } = item;
            const summary = summarizeEvent(entry);
            if (!summary) return null;

            const isError = entry.event === 'PostToolUseFailure';
            const isSystem = entry.event === 'SessionStart' || entry.event === 'SessionEnd' || entry.event === 'Stop';
            const toolIcon = entry.tool ? (TOOL_ICONS[entry.tool] ?? '\u{1F527}') : '';

            if (isSystem) {
              return (
                <div key={`e-${entry.id}`} style={{
                  textAlign: 'center',
                  marginBottom: 6,
                  marginTop: 6,
                }}>
                  <span style={{
                    fontSize: 10,
                    color: '#555570',
                    padding: '2px 10px',
                    background: '#1a1a28',
                    borderRadius: 10,
                  }}>
                    {summary} &middot; {formatTime(entry.timestamp)}
                  </span>
                </div>
              );
            }

            return (
              <div key={`e-${entry.id}`} style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: 6,
              }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '6px 10px',
                  borderRadius: '12px 12px 12px 2px',
                  background: isError ? '#3a1a1a' : '#1a1a2e',
                  border: `1px solid ${isError ? '#4a2a2a' : '#2a2a3e'}`,
                }}>
                  <div style={{ fontSize: 12, color: isError ? '#f87171' : '#b0b0c0' }}>
                    {toolIcon && <span style={{ marginRight: 4 }}>{toolIcon}</span>}
                    {summary}
                  </div>
                  <div style={{ fontSize: 10, color: '#555570', marginTop: 2 }}>
                    {formatTime(entry.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
