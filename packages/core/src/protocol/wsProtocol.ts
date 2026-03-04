import type { AgentInfo, AgentState, CompletedSession, ToolAnimation } from '../events/types.js';
import type { AgentStats, EventLogEntry } from '../state/sessionStore.js';

export type WSServerMessage =
  | { type: 'agent:spawn'; agent: AgentInfo }
  | { type: 'agent:despawn'; sessionId: string }
  | { type: 'agent:state'; sessionId: string; state: AgentState; tool: string | null; animation: ToolAnimation | null; timestamp: number }
  | { type: 'agent:prompt'; sessionId: string; prompt: string }
  | { type: 'agent:rename'; sessionId: string; name: string | null }
  | { type: 'agent:completed'; session: CompletedSession }
  | { type: 'event:new'; entry: EventLogEntry }
  | { type: 'stats:update'; stats: AgentStats }
  | { type: 'snapshot'; agents: AgentInfo[]; recentEvents: EventLogEntry[]; completedSessions: CompletedSession[]; stats: AgentStats }
  | { type: 'system:heartbeat'; timestamp: number }
  | { type: 'terminal:output'; tabId: string; data: string }
  | { type: 'terminal:exited'; tabId: string; exitCode: number };

export type WSClientMessage =
  | { type: 'ping' }
  | { type: 'request:snapshot' }
  | { type: 'terminal:spawn'; tabId: string; cwd?: string; skipPermissions?: boolean }
  | { type: 'terminal:input'; tabId: string; data: string }
  | { type: 'terminal:resize'; tabId: string; cols: number; rows: number }
  | { type: 'terminal:close'; tabId: string };
