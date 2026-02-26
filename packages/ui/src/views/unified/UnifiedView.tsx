import { useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import type { WSServerMessage } from '@claude-alive/core';
import { useWebSocket } from '../dashboard/hooks/useWebSocket.ts';
import { ProjectSidebar } from './ProjectSidebar.tsx';
import { RightPanel } from './RightPanel.tsx';
import { NotificationBanner } from '../dashboard/components/NotificationBanner.tsx';
import PixelCanvas from '../pixel/components/PixelCanvas.tsx';
import {
  createOfficeState,
  updateOffice,
  getEntities,
  spawnCharacter,
  despawnCharacter,
} from '../pixel/engine/officeState';
import { startToolActivity, setCharacterIdle, hitTestCharacter, getAnthropomorphicText } from '../pixel/engine/character';
import type { Entity } from '../pixel/engine/renderer';

// TODO: 3D 뷰 추후 복원 시 주석 해제
// const LazyBattlefieldScene = lazy(() =>
//   import('../3d/components/BattlefieldScene.tsx').then(m => ({ default: m.BattlefieldScene }))
// );
// const LazyAgentModel = lazy(() =>
//   import('../3d/components/AgentModel.tsx').then(m => ({ default: m.AgentModel }))
// );
// const LazyToolParticles = lazy(() =>
//   import('../3d/components/ToolParticles.tsx').then(m => ({ default: m.ToolParticles }))
// );

// Lazy-load Bishoujo (Live2D) components
const LazyBishoujoCanvas = lazy(() =>
  import('../bishoujo/components/BishoujoCanvas.tsx').then(m => ({ default: m.BishoujoCanvas }))
);

export type ViewMode = 'pixel' | 'bishoujo';
// TODO: 3D 뷰 추후 복원 시 'three-d' 추가
// export type ViewMode = 'three-d' | 'pixel' | 'bishoujo';

const WS_URL = `ws://${window.location.hostname}:${window.location.port || '3141'}/ws`;
const API_BASE = `${window.location.protocol}//${window.location.hostname}:${window.location.port || '3141'}`;

// TODO: 3D 뷰 추후 복원 시 주석 해제
// const AGENT_COLORS = [
//   '#448aff', '#00c853', '#7c4dff', '#ff6d00',
//   '#00bcd4', '#e91e63', '#ffab00', '#76ff03',
// ];
//
// function assignGridPosition(index: number): [number, number, number] {
//   const cols = 4;
//   const spacing = 3;
//   const offsetX = -((cols - 1) * spacing) / 2;
//   const col = index % cols;
//   const row = Math.floor(index / cols);
//   return [offsetX + col * spacing, 0, -4 + row * spacing];
// }
//
// type AgentVisualState = 'idle' | 'active' | 'waiting' | 'error';
//
// function mapAgentState(state: string): AgentVisualState {
//   switch (state) {
//     case 'active':
//     case 'listening':
//       return 'active';
//     case 'waiting':
//     case 'spawning':
//     case 'despawning':
//       return 'waiting';
//     case 'error':
//       return 'error';
//     default:
//       return 'idle';
//   }
// }

function mapToolAnimation(animation: string | null): 'typing' | 'reading' {
  switch (animation) {
    case 'reading':
    case 'searching':
      return 'reading';
    default:
      return 'typing';
  }
}

// ── Pixel engine (module-level singleton) ────────────────────────────────

const officeState = createOfficeState();

// ── Component ────────────────────────────────────────────────────────────

interface UnifiedViewProps {
  viewMode: ViewMode;
}

export function UnifiedView({ viewMode }: UnifiedViewProps) {
  const { t } = useTranslation();

  // Pixel engine refs
  const camera = useRef(officeState.camera);
  const entities = useRef<Entity[]>(getEntities(officeState));

  // Handle raw WS messages for pixel engine
  const handleRawMessage = useCallback((msg: WSServerMessage) => {
    switch (msg.type) {
      case 'snapshot': {
        for (const agent of msg.agents) {
          if (!officeState.characters.has(agent.sessionId)) {
            const char = spawnCharacter(officeState, agent.sessionId, {
              isSubAgent: agent.parentId !== null,
              label: agent.displayName || (agent.parentId ? agent.projectName : null),
              project: agent.cwd,
            });
            char.bubbleText = getAnthropomorphicText(
              agent.state, agent.currentTool, agent.currentToolAnimation,
            );
            if (agent.state === 'active' && agent.currentToolAnimation) {
              startToolActivity(char, mapToolAnimation(agent.currentToolAnimation), officeState.tileMap);
            } else if (agent.state === 'waiting') {
              char.bubble = 'waiting';
            } else if (agent.state === 'error') {
              char.bubble = 'error';
            }
            if (agent.currentTool) {
              char.tooltipTool = agent.currentTool;
            }
          }
        }
        break;
      }
      case 'agent:spawn':
        spawnCharacter(officeState, msg.agent.sessionId, {
          isSubAgent: msg.agent.parentId !== null,
          label: msg.agent.displayName || (msg.agent.parentId ? msg.agent.projectName : null),
          project: msg.agent.cwd,
        });
        break;
      case 'agent:despawn':
        despawnCharacter(officeState, msg.sessionId);
        break;
      case 'agent:state': {
        const char = officeState.characters.get(msg.sessionId);
        if (!char) break;
        // Update tooltip tool info
        if (msg.tool) char.tooltipTool = msg.tool;
        switch (msg.state) {
          case 'active': {
            const anim = mapToolAnimation(msg.animation);
            startToolActivity(char, anim, officeState.tileMap);
            char.bubble = 'none';
            break;
          }
          case 'idle':
            setCharacterIdle(char);
            break;
          case 'done':
            // Keep character idle but pin farewell bubble
            char.state = 'idle';
            char.animFrame = 0;
            char.animTimer = 0;
            char.bubble = 'none';
            char.bubbleLarge = true;
            break;
          case 'listening':
            setCharacterIdle(char);
            char.direction = 'down';
            break;
          case 'waiting':
            char.bubble = 'waiting';
            break;
          case 'error':
            char.bubble = 'error';
            break;
          case 'despawning':
            despawnCharacter(officeState, msg.sessionId);
            break;
        }
        // Set after switch so setCharacterIdle() doesn't clear it
        char.bubbleText = getAnthropomorphicText(msg.state, msg.tool, msg.animation);
        break;
      }
      case 'agent:prompt': {
        const char = officeState.characters.get(msg.sessionId);
        if (char) char.direction = 'down';
        break;
      }
      case 'agent:rename': {
        const char = officeState.characters.get(msg.sessionId);
        if (char) char.label = msg.name;
        break;
      }
    }
  }, []);

  const { agents, events, completedSessions } = useWebSocket(WS_URL, handleRawMessage);
  const agentList = Array.from(agents.values());

  // Rename handler
  const handleRename = useCallback((sessionId: string, name: string | null) => {
    fetch(`${API_BASE}/api/agents/${sessionId}/name`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).catch(() => {});
  }, []);

  // Handle character click — toggle tooltip
  const handleWorldClick = useCallback((worldX: number, worldY: number) => {
    let hitId: string | null = null;
    for (const char of officeState.characters.values()) {
      if (hitTestCharacter(char, worldX, worldY)) {
        hitId = char.sessionId;
        break;
      }
    }

    // Toggle tooltip on clicked character, hide all others
    for (const char of officeState.characters.values()) {
      char.showTooltip = char.sessionId === hitId && !char.showTooltip;
    }
    officeState.selectedCharacterId = hitId;
  }, []);

  // Pixel game loop (runs always so characters stay updated)
  useEffect(() => {
    let running = true;
    let lastTime = performance.now();

    function tick() {
      if (!running) return;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      updateOffice(officeState, dt);
      entities.current = getEntities(officeState);
      officeState.camera = camera.current;

      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    return () => { running = false; };
  }, []);

  // TODO: 3D 뷰 추후 복원 시 주석 해제
  // const battleAgents = useMemo(() => {
  //   return agentList.map((agent, i) => ({
  //     sessionId: agent.sessionId,
  //     position: assignGridPosition(i) as [number, number, number],
  //     color: AGENT_COLORS[i % AGENT_COLORS.length],
  //     state: mapAgentState(agent.state),
  //   }));
  // }, [agentList]);

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* Left sidebar: Projects */}
      <ProjectSidebar agents={agentList} onRename={handleRename} />

      {/* Center: Pixel, 3D, or Bishoujo canvas */}
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
        {viewMode === 'pixel' ? (
          <PixelCanvas
            camera={camera}
            tileMap={officeState.tileMap}
            entities={entities}
            onWorldClick={handleWorldClick}
          />
        ) : (
          <Suspense
            fallback={
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                }}
              >
                {t('loadingBishoujo')}
              </div>
            }
          >
            <LazyBishoujoCanvas agents={agentList} />
          </Suspense>
        )}
        {/* TODO: 3D 뷰 추후 복원 시 viewMode === 'three-d' 분기 추가
        <Suspense fallback={...}>
          <LazyBattlefieldScene>
            {battleAgents.map(agent => (
              <group key={agent.sessionId}>
                <LazyAgentModel position={agent.position} color={agent.color} state={agent.state} />
                <LazyToolParticles position={...} color={agent.color} active={agent.state === 'active'} />
              </group>
            ))}
          </LazyBattlefieldScene>
        </Suspense>
        */}

        {/* Notification overlay at bottom of center */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 20,
            right: 20,
            zIndex: 10,
            pointerEvents: 'auto',
          }}
        >
          <NotificationBanner agents={agentList} />
        </div>
      </div>

      {/* Right sidebar: Activity + Events */}
      <RightPanel events={events} agents={agentList} completedSessions={completedSessions} />
    </div>
  );
}
