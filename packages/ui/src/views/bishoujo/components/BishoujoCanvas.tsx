import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Application, Container, Graphics } from 'pixi.js';
import type { AgentInfo } from '@claude-alive/core';
import { UIOverlay } from './UIOverlay.tsx';
import { assignSlots } from '../engine/sceneLayout.ts';
import {
  createInteractionState,
  updateTracking,
  triggerClick,
  type InteractionState,
} from '../engine/interactionHandler.ts';
import { BG_COLOR } from '../engine/constants.ts';
import {
  BREATH_PERIOD,
  BREATH_AMPLITUDE,
  BLINK_INTERVAL_MIN,
  BLINK_INTERVAL_MAX,
  BLINK_DURATION,
  IDLE_SWAY_PERIOD_MIN,
  IDLE_SWAY_AMPLITUDE,
  CLICK_SURPRISE_DURATION,
} from '../engine/constants.ts';
import {
  mapStateToParams,
  lerpTargets,
  type Live2DParamTargets,
} from '../engine/parameterMapper.ts';
import { createMood, onStateChange as moodStateChange, tickMood, moodToOffsets } from '../engine/moodSystem.ts';
import { getTrackingAngles } from '../engine/interactionHandler.ts';

// Ensure window.PIXI is set (required by pixi-live2d-display)
import '../engine/live2dManager.ts';
import { loadModel } from '../engine/live2dManager.ts';
import type { Live2DModel } from '@naari3/pixi-live2d-display';

// ── Per-character runtime state ─────────────────────
interface CharacterState {
  sessionId: string;
  model: Live2DModel | null;
  container: Container;
  loading: boolean;
  params: Live2DParamTargets;
  mood: ReturnType<typeof createMood>;
  elapsed: number;
  nextBlink: number;
  blinkPhase: 'none' | 'closing' | 'opening';
  blinkTimer: number;
  swayOffset: number;
  spawnProgress: number;
  prevAgentState: string;
}

function createCharacterState(sessionId: string): CharacterState {
  return {
    sessionId,
    model: null,
    container: new Container(),
    loading: false,
    params: mapStateToParams('idle', null),
    mood: createMood(),
    elapsed: 0,
    nextBlink: BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN),
    blinkPhase: 'none',
    blinkTimer: 0,
    swayOffset: Math.random() * Math.PI * 2,
    spawnProgress: 0,
    prevAgentState: 'idle',
  };
}

// ── Component ───────────────────────────────────────

interface BishoujoCanvasProps {
  agents: AgentInfo[];
}

export function BishoujoCanvas({ agents }: BishoujoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const charsRef = useRef<Map<string, CharacterState>>(new Map());
  const interactionRef = useRef<InteractionState>(createInteractionState());
  const agentsRef = useRef<AgentInfo[]>(agents);
  agentsRef.current = agents;

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [appReady, setAppReady] = useState(false);

  // Slot assignments
  const sessionKey = useMemo(() => agents.map(a => a.sessionId).join(','), [agents]);
  const sessionIds = useMemo(() => agents.map(a => a.sessionId), [sessionKey]);
  const slotMap = useMemo(() => assignSlots(sessionIds), [sessionIds]);
  const slotMapRef = useRef(slotMap);
  slotMapRef.current = slotMap;

  // ── Init PixiJS Application ─────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const app = new Application();
    appRef.current = app;

    let destroyed = false;

    app.init({
      canvas,
      backgroundColor: BG_COLOR,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      resizeTo: wrapper,
    }).then(() => {
      if (destroyed) return;

      // pixi-live2d-display needs window.app to access the renderer
      (window as any).app = app;

      // Draw background
      const bg = new Graphics();
      app.stage.addChild(bg);
      app.stage.sortableChildren = true;

      const drawBg = () => {
        const w = app.screen.width;
        const h = app.screen.height;
        bg.clear();
        bg.rect(0, 0, w, h).fill(BG_COLOR);
        bg.rect(0, h * 0.6, w, h * 0.4).fill({ color: 0x16213e, alpha: 0.5 });
        // Window
        bg.roundRect(w * 0.05, h * 0.05, w * 0.18, h * 0.35, 4).fill({ color: 0x2a3a5c, alpha: 0.6 });
        bg.roundRect(w * 0.05 + 4, h * 0.05 + 4, w * 0.18 - 8, h * 0.35 - 8, 2).fill({ color: 0x3a5080, alpha: 0.3 });
        // Desk
        const dw = w * 0.5, dx = (w - dw) / 2;
        bg.roundRect(dx, h * 0.82, dw, h * 0.06, 3).fill({ color: 0x12121e, alpha: 0.7 });
        // Shelf
        const sx = w * 0.82, sw = w * 0.12;
        bg.roundRect(sx, h * 0.15, sw, h * 0.04, 2).fill({ color: 0x12121e, alpha: 0.5 });
        bg.roundRect(sx, h * 0.27, sw, h * 0.04, 2).fill({ color: 0x12121e, alpha: 0.5 });
        bg.roundRect(sx, h * 0.39, sw, h * 0.04, 2).fill({ color: 0x12121e, alpha: 0.5 });
      };
      drawBg();
      bg.zIndex = -1;

      // Resize handler
      const ro = new ResizeObserver(() => {
        if (!destroyed) {
          app.resize();
          drawBg();
          setSize({ width: app.screen.width, height: app.screen.height });
        }
      });
      ro.observe(wrapper);
      setSize({ width: app.screen.width, height: app.screen.height });
      setAppReady(true);

      // ── Animation loop ──────────────────────────
      app.ticker.add((ticker) => {
        const dt = ticker.deltaMS / 1000;
        const agents = agentsRef.current;
        const slots = slotMapRef.current;
        const interaction = interactionRef.current;
        updateTracking(interaction, dt);
        const tracking = getTrackingAngles(interaction);

        for (const agent of agents) {
          const cs = charsRef.current.get(agent.sessionId);
          if (!cs || !cs.model) continue;

          const slot = slots.get(agent.sessionId);
          if (!slot) continue;

          // Update position
          cs.container.position.set(
            slot.def.x * app.screen.width,
            slot.def.y * app.screen.height,
          );
          cs.container.zIndex = slot.def.z;

          const model = cs.model;
          cs.elapsed += dt;
          const t = cs.elapsed;

          // Mood
          if (agent.state !== cs.prevAgentState) {
            moodStateChange(cs.mood, agent.state);
            cs.prevAgentState = agent.state;
          }
          tickMood(cs.mood, dt);
          const moodOff = moodToOffsets(cs.mood);

          // Spawn fade-in
          if (cs.spawnProgress < 1) {
            cs.spawnProgress = Math.min(1, cs.spawnProgress + dt * 2.5);
            const ease = 1 - Math.pow(1 - cs.spawnProgress, 3);
            model.alpha = ease;
            model.scale.set(slot.def.scale * (0.8 + 0.2 * ease));
          }

          // Parameter targets
          const targets = mapStateToParams(agent.state, agent.currentToolAnimation);
          cs.params = lerpTargets(cs.params, targets, 0.08);
          const p = cs.params;

          // Breath
          const breath = Math.sin((t * Math.PI * 2) / BREATH_PERIOD) * BREATH_AMPLITUDE;

          // Blink
          let blinkMod = 1;
          cs.nextBlink -= dt;
          if (cs.nextBlink <= 0 && cs.blinkPhase === 'none') {
            cs.blinkPhase = 'closing';
            cs.blinkTimer = 0;
          }
          if (cs.blinkPhase === 'closing') {
            cs.blinkTimer += dt;
            blinkMod = 1 - cs.blinkTimer / BLINK_DURATION;
            if (cs.blinkTimer >= BLINK_DURATION) { cs.blinkPhase = 'opening'; cs.blinkTimer = 0; }
          } else if (cs.blinkPhase === 'opening') {
            cs.blinkTimer += dt;
            blinkMod = cs.blinkTimer / BLINK_DURATION;
            if (cs.blinkTimer >= BLINK_DURATION) {
              cs.blinkPhase = 'none';
              cs.nextBlink = BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN);
              blinkMod = 1;
            }
          }
          blinkMod = Math.max(0, Math.min(1, blinkMod));

          // Sway
          const sway = Math.sin((t * Math.PI * 2) / (IDLE_SWAY_PERIOD_MIN + 2) + cs.swayOffset) * IDLE_SWAY_AMPLITUDE;

          // Reading eye scan
          let readEyeX = 0;
          if (agent.currentToolAnimation === 'reading') readEyeX = Math.sin(t * 2) * 0.5;
          else if (agent.currentToolAnimation === 'searching') readEyeX = Math.sin(t * 3) * 0.7;

          // Click reaction
          let clickMod = 0;
          if (interaction.clickedSessionId === agent.sessionId && interaction.clickTimer > 0) {
            clickMod = interaction.clickTimer / CLICK_SURPRISE_DURATION;
          }

          // Apply focus (built-in interpolation for head/eye direction)
          model.focus(
            (tracking.eyeBallX + readEyeX) * 500,
            tracking.eyeBallY * 500,
          );

          // Direct parameter access
          const im = model.internalModel;
          if (!im) continue;
          const core = (im as any).coreModel;
          if (!core) continue;

          const set = (name: string, val: number) => {
            try { core.setParameterValueById?.(name, val); } catch { /* param may not exist */ }
          };

          set('ParamBodyAngleX', p.bodyAngleX + sway + tracking.angleY * 0.3);
          set('ParamBodyAngleY', p.bodyAngleY);
          set('ParamAngleX', p.angleX + tracking.angleX + (clickMod > 0 ? 5 : 0));
          set('ParamAngleZ', p.angleZ);
          set('ParamEyeLOpen', Math.max(0, p.eyeLOpen * blinkMod + moodOff.eyeLOpen + (clickMod > 0 ? 0.3 : 0)));
          set('ParamEyeROpen', Math.max(0, p.eyeROpen * blinkMod + moodOff.eyeROpen + (clickMod > 0 ? 0.3 : 0)));
          set('ParamMouthOpenY', p.mouthOpenY + (clickMod > 0 ? 0.4 : 0));
          set('ParamMouthForm', p.mouthForm + moodOff.mouthForm);
          set('ParamBrowLY', p.browLY + moodOff.browLY);
          set('ParamBrowRY', p.browRY + moodOff.browRY);
          set('ParamBreath', breath);
        }
      });
    });

    return () => {
      destroyed = true;
      if ((window as any).app === app) (window as any).app = undefined;
      app.destroy(true);
      appRef.current = null;
      setAppReady(false);
    };
  }, []);

  // ── Sync characters with agents ─────────────────
  useEffect(() => {
    const app = appRef.current;
    if (!appReady || !app) return;

    const currentIds = new Set(agents.map(a => a.sessionId));
    const chars = charsRef.current;

    // Remove despawned
    for (const [id, cs] of chars) {
      if (!currentIds.has(id)) {
        if (cs.model) cs.model.destroy();
        app.stage.removeChild(cs.container);
        cs.container.destroy();
        chars.delete(id);
      }
    }

    // Add new
    for (const agent of agents) {
      if (chars.has(agent.sessionId)) continue;
      const slot = slotMap.get(agent.sessionId);
      if (!slot) continue;

      const cs = createCharacterState(agent.sessionId);
      cs.loading = true;
      chars.set(agent.sessionId, cs);

      cs.container.sortableChildren = true;
      cs.container.zIndex = slot.def.z;
      app.stage.addChild(cs.container);

      loadModel(slot.modelName).then(model => {
        if (!chars.has(agent.sessionId)) {
          model.destroy();
          return;
        }

        // Fix half-rendering on Retina displays:
        // The library's _onRenderCallback sets internalModel.viewport
        // using CSS pixel dimensions (renderer.width/height), then calls
        // internalModel.draw(gl). Inside draw(), setRenderState(fbo,
        // this.viewport) stores it in static s_viewport. Clipping mask
        // ops restore viewport from s_viewport — but gl.viewport needs
        // physical pixels, not CSS pixels. On devicePixelRatio=2, CSS
        // viewport is half the canvas, so models render in the bottom-
        // left quadrant.
        //
        // Fix: patch internalModel.draw() to correct viewport to
        // physical pixels AFTER the library sets it but BEFORE
        // setRenderState uses it. The projection matrix (calculated
        // from CSS coords) + physical viewport = correct mapping.
        const waitForInternalModel = () => {
          const im = (model as any).internalModel;
          if (!im) {
            requestAnimationFrame(waitForInternalModel);
            return;
          }
          const originalDraw = im.draw.bind(im);
          im.draw = (gl: WebGL2RenderingContext) => {
            im.viewport = [0, 0, gl.canvas.width, gl.canvas.height];
            originalDraw(gl);
            // Reset GL state for next model
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.disable(gl.SCISSOR_TEST);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          };
        };
        waitForInternalModel();

        cs.model = model;
        cs.loading = false;
        model.anchor.set(0.5, 0.87);
        model.scale.set(slot.def.scale);
        model.alpha = 0;
        model.position.set(0, 0);
        cs.container.addChild(model);
        cs.container.position.set(
          slot.def.x * app.screen.width,
          slot.def.y * app.screen.height,
        );
      }).catch(err => {
        console.warn(`[bishoujo] Failed to load model for ${agent.sessionId}:`, err);
        cs.loading = false;
      });
    }
  }, [agents, slotMap, appReady]);

  // Mouse tracking
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    interactionRef.current.mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    interactionRef.current.mouseY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
  }, []);

  // Click on character → surprise reaction
  const handleCharacterClick = useCallback((sessionId: string) => {
    triggerClick(interactionRef.current, sessionId);
  }, []);

  return (
    <div
      ref={wrapperRef}
      onMouseMove={handleMouseMove}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* DOM overlay for names, bubbles, status */}
      <UIOverlay
        agents={agents}
        slotMap={slotMap}
        canvasWidth={size.width}
        canvasHeight={size.height}
        onCharacterClick={handleCharacterClick}
      />
    </div>
  );
}
