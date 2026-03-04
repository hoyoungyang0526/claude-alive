import type { AgentInfo, CompletedSession, EventLogEntry, AgentStats as AgentStatsType } from '@claude-alive/core';
import { ActivityPulse } from '../dashboard/components/ActivityPulse.tsx';
import { EventStream } from '../dashboard/components/EventStream.tsx';
import { CompletionLog } from '../dashboard/components/CompletionLog.tsx';
import { AgentStats } from '../dashboard/components/AgentStats.tsx';

interface RightPanelProps {
  events: EventLogEntry[];
  agents: AgentInfo[];
  completedSessions: CompletedSession[];
  stats: AgentStatsType | null;
}

export function RightPanel({ events, agents, completedSessions, stats }: RightPanelProps) {
  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        width: 360,
        minWidth: 360,
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-color)',
      }}
    >
      {/* Agent Stats */}
      <div className="shrink-0 p-4 pb-0">
        <AgentStats stats={stats} />
      </div>

      {/* Activity Pulse */}
      <div className="shrink-0 p-4 pb-0">
        <ActivityPulse events={events} />
      </div>

      {/* Completion Log */}
      {completedSessions.length > 0 && (
        <div className="shrink-0 p-4 pb-0">
          <CompletionLog completedSessions={completedSessions} />
        </div>
      )}

      {/* Event Stream - fills remaining space */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 p-4 pt-4">
        <EventStream events={events} agents={agents} />
      </div>
    </div>
  );
}
