import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Application, Container } from 'pixi.js';
import { MODEL_NAMES, modelPath, BG_COLOR } from '../bishoujo/engine/constants.ts';
import type { ModelName } from '../bishoujo/engine/constants.ts';

// Ensure window.PIXI is set for Live2D
import '../bishoujo/engine/live2dManager.ts';
import { Live2DModel } from '@naari3/pixi-live2d-display';

const CARD_W = 300;
const CARD_H = 420;

function ModelCard({ name }: { name: ModelName }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    let destroyed = false;
    const app = new Application();

    (async () => {
      try {
        await app.init({
          canvas,
          backgroundColor: BG_COLOR,
          antialias: true,
          autoDensity: true,
          resolution: window.devicePixelRatio || 1,
          resizeTo: wrapper,
        });

        if (destroyed) return;

        const model = await Live2DModel.from(modelPath(name), {
          autoHitTest: false,
          autoFocus: false,
          autoUpdate: true,
        });

        if (destroyed) { model.destroy(); return; }

        // Retina viewport patch
        const im = (model as any).internalModel;
        if (im) {
          const origDraw = im.draw.bind(im);
          im.draw = (gl: WebGLRenderingContext) => {
            const s = im.drawingManager ?? im;
            const origSet = s.setRenderState?.bind(s);
            if (origSet) {
              s.setRenderState = (fbo: any, vp: number[]) => {
                vp[2] = gl.canvas.width;
                vp[3] = gl.canvas.height;
                origSet(fbo, vp);
              };
            }
            origDraw(gl);
            if (origSet) s.setRenderState = origSet;
          };
        }

        const container = new Container();
        container.addChild(model);

        const canvasH = CARD_H - 60;
        const scale = 0.13;
        model.scale.set(scale, scale);
        model.anchor.set(0.5, 0.87);
        model.x = CARD_W / 2;
        model.y = canvasH * 0.88;

        app.stage.addChild(container);
        setLoading(false);
      } catch {
        if (!destroyed) setError(true);
        setLoading(false);
      }
    })();

    return () => {
      destroyed = true;
      try { app.destroy(true); } catch { /* resize observer cleanup */ }
    };
  }, [name]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 12,
        overflow: 'hidden',
        width: CARD_W,
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-purple)';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(124, 77, 255, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-color)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div ref={wrapperRef} style={{ position: 'relative', width: CARD_W, height: CARD_H - 60 }}>
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
        {loading && !error && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', fontSize: 12,
          }}>
            Loading...
          </div>
        )}
        {error && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-red)', fontSize: 12,
          }}>
            Failed to load
          </div>
        )}
      </div>

      <div style={{
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
      }}>
        <span style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '0.02em',
        }}>
          {name}
        </span>
      </div>
    </div>
  );
}

export function GalleryPage() {
  const { t } = useTranslation();

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflow: 'auto',
      background: 'var(--bg-primary)',
    }}>
      <div style={{
        maxWidth: 1080,
        margin: '0 auto',
        padding: '32px 24px 48px',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
          marginBottom: 28,
        }}>
          <h1 style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}>
            {t('gallery.title')}
          </h1>
          <span style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
          }}>
            {t('gallery.count', { count: MODEL_NAMES.length })}
          </span>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fill, ${CARD_W}px)`,
          gap: 24,
          justifyContent: 'center',
        }}>
          {MODEL_NAMES.map((name) => (
            <ModelCard key={name} name={name} />
          ))}
        </div>
      </div>
    </div>
  );
}
