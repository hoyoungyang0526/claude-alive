import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export interface ToastItem {
  id: string;
  type: 'warning' | 'error' | 'success';
  agentLabel: string;
  messageKey: string;
  timestamp: number;
}

const TOAST_DURATION = 5000;

const TYPE_CONFIG: Record<ToastItem['type'], { color: string; borderColor: string; icon: string }> = {
  warning: {
    color: 'var(--accent-amber)',
    borderColor: 'rgba(210, 153, 34, 0.4)',
    icon: '\u26A0',
  },
  error: {
    color: 'var(--accent-red)',
    borderColor: 'rgba(248, 81, 73, 0.4)',
    icon: '\u2716',
  },
  success: {
    color: 'var(--accent-green)',
    borderColor: 'rgba(63, 185, 80, 0.4)',
    icon: '\u2714',
  },
};

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const { t } = useTranslation();
  const [exiting, setExiting] = useState(false);
  const config = TYPE_CONFIG[toast.type];

  useEffect(() => {
    const fadeTimer = setTimeout(() => setExiting(true), TOAST_DURATION - 300);
    const removeTimer = setTimeout(() => onDismiss(toast.id), TOAST_DURATION);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onDismiss]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        background: 'rgba(13, 17, 23, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${config.borderColor}`,
        borderLeft: `3px solid ${config.color}`,
        borderRadius: 10,
        minWidth: 240,
        maxWidth: 360,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateX(20px)' : 'translateX(0)',
        transition: 'opacity 300ms ease, transform 300ms ease',
        animation: 'toast-in 300ms ease',
      }}
    >
      <span style={{ fontSize: 14, color: config.color, flexShrink: 0 }}>
        {config.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {toast.agentLabel}
        </div>
        <div style={{ fontSize: 11, color: config.color, marginTop: 2 }}>
          {t(toast.messageKey)}
        </div>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: 11,
          padding: '2px 4px',
          opacity: 0.5,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

let toastIdCounter = 0;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const recentRef = useRef(new Map<string, number>());

  const addToast = useCallback((type: ToastItem['type'], agentLabel: string, messageKey: string, dedupeKey?: string) => {
    // Deduplicate: skip if same agent+type fired within 3 seconds
    if (dedupeKey) {
      const lastTime = recentRef.current.get(dedupeKey);
      if (lastTime && Date.now() - lastTime < 3000) return;
      recentRef.current.set(dedupeKey, Date.now());
    }

    const id = `toast-${++toastIdCounter}`;
    setToasts(prev => [...prev.slice(-4), { id, type, agentLabel, messageKey, timestamp: Date.now() }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          top: 68,
          right: 16,
          zIndex: 1100,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'auto',
        }}
      >
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  );
}
