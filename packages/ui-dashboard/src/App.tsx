import { useCallback } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { AgentCard } from './components/AgentCard';
import { ActivityPulse } from './components/ActivityPulse';
import { EventStream } from './components/EventStream';

const WS_URL = `ws://${window.location.hostname}:${window.location.port || '3141'}/ws`;
const API_BASE = `${window.location.protocol}//${window.location.hostname}:${window.location.port || '3141'}`;

function App() {
  const { agents, events, connected } = useWebSocket(WS_URL);
  const agentList = Array.from(agents.values());

  const handleRename = useCallback((sessionId: string, name: string | null) => {
    fetch(`${API_BASE}/api/agents/${sessionId}/name`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <Header connected={connected} agentCount={agentList.length} />

      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Stats Bar */}
        <StatsBar agents={agentList} events={events} />

        {/* Agent Grid */}
        <section>
          <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
            Agents
          </h2>
          {agentList.length === 0 ? (
            <div
              className="rounded-lg border p-8 text-center"
              style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}
            >
              <div className="text-lg mb-2" style={{ color: 'var(--text-secondary)' }}>No agents yet</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Start a Claude Code session — it will appear here automatically.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {agentList.map(agent => (
                <AgentCard key={agent.sessionId} agent={agent} onRename={handleRename} />
              ))}
            </div>
          )}
        </section>

        {/* Activity Pulse */}
        <ActivityPulse events={events} />

        {/* Event Stream */}
        <section>
          <EventStream events={events} />
        </section>
      </main>
    </div>
  );
}

export default App;
