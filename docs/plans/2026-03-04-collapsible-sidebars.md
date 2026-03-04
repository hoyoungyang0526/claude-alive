# Collapsible Sidebars Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add collapsible left/right sidebars with Cursor-style toggle buttons in the HeaderBar, using smooth slide animations.

**Architecture:** State lives in App.tsx (`leftPanelOpen`/`rightPanelOpen`), passed as props to HeaderBar (toggle buttons) and PixelOfficePage (sidebar visibility). Sidebars use CSS transitions on width/opacity for smooth collapse.

**Tech Stack:** React 19, TypeScript, CSS transitions, i18next

---

### Task 1: Add i18n keys

**Files:**
- Modify: `packages/i18n/src/locales/en.json`
- Modify: `packages/i18n/src/locales/ko.json`

**Step 1: Add sidebar toggle keys to en.json**

Add to the `"header"` section:

```json
"header": {
  "title": "claude-alive",
  "agentCount_one": "{{count}} agent",
  "agentCount_other": "{{count}} agents",
  "toggleLeftPanel": "Toggle left panel",
  "toggleRightPanel": "Toggle right panel"
}
```

**Step 2: Add sidebar toggle keys to ko.json**

Add to the `"header"` section:

```json
"header": {
  "title": "claude-alive",
  "agentCount_one": "에이전트 {{count}}개",
  "agentCount_other": "에이전트 {{count}}개",
  "toggleLeftPanel": "왼쪽 패널 토글",
  "toggleRightPanel": "오른쪽 패널 토글"
}
```

**Step 3: Verify no typos**

Run: `cd /Users/mufin/Documents/claude-management/claude-ui/claude-alive && node -e "const en = require('./packages/i18n/src/locales/en.json'); const ko = require('./packages/i18n/src/locales/ko.json'); console.log('EN header:', en.header); console.log('KO header:', ko.header);"`

---

### Task 2: Add panel state to App.tsx and pass props

**Files:**
- Modify: `packages/ui/src/App.tsx`

**Step 1: Add state and update HeaderBar/PixelOfficePage props**

Replace the `App` function:

```tsx
export default function App() {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <HeaderBar
        leftPanelOpen={leftPanelOpen}
        rightPanelOpen={rightPanelOpen}
        onToggleLeftPanel={() => setLeftPanelOpen(prev => !prev)}
        onToggleRightPanel={() => setRightPanelOpen(prev => !prev)}
      />
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <ErrorBoundary>
          <Suspense fallback={null}>
            <PixelOfficePage leftPanelOpen={leftPanelOpen} rightPanelOpen={rightPanelOpen} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
```

Add `useState` to the import from React:

```tsx
import { Component, lazy, Suspense, useState } from 'react';
```

---

### Task 3: Add toggle buttons to HeaderBar

**Files:**
- Modify: `packages/ui/src/components/HeaderBar.tsx`

**Step 1: Update props interface and add toggle buttons**

Replace entire `HeaderBar.tsx`:

```tsx
import { useTranslation } from 'react-i18next';

interface HeaderBarProps {
  leftPanelOpen?: boolean;
  rightPanelOpen?: boolean;
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
}

export function HeaderBar({ leftPanelOpen = true, rightPanelOpen = true, onToggleLeftPanel, onToggleRightPanel }: HeaderBarProps) {
  const { t, i18n } = useTranslation();
  const isKo = i18n.language?.startsWith('ko');

  const toggleLang = () => {
    i18n.changeLanguage(isKo ? 'en' : 'ko');
  };

  const iconButtonStyle = {
    width: 32,
    height: 32,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    cursor: 'pointer' as const,
    fontSize: 14,
    color: 'var(--text-secondary)',
    background: 'transparent',
    transition: 'all 0.2s ease',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 56,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 24px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      {/* Left panel toggle */}
      <button
        onClick={onToggleLeftPanel}
        style={iconButtonStyle}
        aria-label={t('header.toggleLeftPanel')}
        title={t('header.toggleLeftPanel')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" />
          <rect x="1" y="1" width="5" height="14" rx="1" fill={leftPanelOpen ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>

      <span
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}
      >
        claude-alive
      </span>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={toggleLang}
          style={{
            height: 32,
            padding: '0 14px',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'inherit',
            color: 'var(--text-secondary)',
            background: 'transparent',
            transition: 'all 0.2s ease',
          }}
        >
          {isKo ? 'EN' : '한'}
        </button>

        {/* Right panel toggle */}
        <button
          onClick={onToggleRightPanel}
          style={iconButtonStyle}
          aria-label={t('header.toggleRightPanel')}
          title={t('header.toggleRightPanel')}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" />
            <rect x="10" y="1" width="5" height="14" rx="1" fill={rightPanelOpen ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
```

Key design notes:
- SVG icons: rectangle with left/right section filled when panel is open, outlined when closed
- Same `iconButtonStyle` as language toggle for visual consistency
- `aria-label` and `title` from i18n keys for accessibility

---

### Task 4: Update PixelOfficePage to accept and pass panel visibility

**Files:**
- Modify: `packages/ui/src/views/pixel/PixelOfficePage.tsx`

**Step 1: Add props to PixelOfficePage**

Change the function signature from:

```tsx
export function PixelOfficePage() {
```

to:

```tsx
interface PixelOfficePageProps {
  leftPanelOpen?: boolean;
  rightPanelOpen?: boolean;
}

export function PixelOfficePage({ leftPanelOpen = true, rightPanelOpen = true }: PixelOfficePageProps) {
```

**Step 2: Pass `collapsed` prop to ProjectSidebar**

Change line 238-243:

```tsx
<ProjectSidebar
  agents={agentList}
  characters={officeRef.current.characters}
  onRename={handleRename}
  onAgentClick={handleAgentClick}
  collapsed={!leftPanelOpen}
/>
```

**Step 3: Pass `collapsed` prop to RightPanel**

Change line 373:

```tsx
<RightPanel events={events} agents={agentList} completedSessions={completedSessions} stats={stats} collapsed={!rightPanelOpen} />
```

---

### Task 5: Add collapse transition to ProjectSidebar

**Files:**
- Modify: `packages/ui/src/views/unified/ProjectSidebar.tsx`

**Step 1: Add `collapsed` prop to interface**

Change `ProjectSidebarProps`:

```tsx
interface ProjectSidebarProps {
  agents: AgentInfo[];
  characters?: Map<string, Character>;
  onRename?: (sessionId: string, name: string | null) => void;
  onAgentClick?: (sessionId: string) => void;
  collapsed?: boolean;
}
```

**Step 2: Update the component to accept and use `collapsed`**

Change the function signature:

```tsx
export function ProjectSidebar({ agents, characters, onRename, onAgentClick, collapsed = false }: ProjectSidebarProps) {
```

**Step 3: Add transition styles to the root div**

Replace the root div's style/className:

```tsx
<div
  className="flex flex-col h-full overflow-hidden shrink-0"
  style={{
    width: collapsed ? 0 : 300,
    minWidth: collapsed ? 0 : 300,
    opacity: collapsed ? 0 : 1,
    background: 'var(--bg-secondary)',
    borderRight: collapsed ? 'none' : '1px solid var(--border-color)',
    transition: 'width 200ms ease, min-width 200ms ease, opacity 150ms ease',
  }}
>
```

---

### Task 6: Add collapse transition to RightPanel

**Files:**
- Modify: `packages/ui/src/views/unified/RightPanel.tsx`

**Step 1: Add `collapsed` prop to interface**

```tsx
interface RightPanelProps {
  events: EventLogEntry[];
  agents: AgentInfo[];
  completedSessions: CompletedSession[];
  stats: AgentStatsType | null;
  collapsed?: boolean;
}
```

**Step 2: Update the component**

```tsx
export function RightPanel({ events, agents, completedSessions, stats, collapsed = false }: RightPanelProps) {
```

**Step 3: Add transition styles to the root div**

Replace the root div's style/className:

```tsx
<div
  className="flex flex-col h-full overflow-hidden"
  style={{
    width: collapsed ? 0 : 360,
    minWidth: collapsed ? 0 : 360,
    opacity: collapsed ? 0 : 1,
    background: 'var(--bg-secondary)',
    borderLeft: collapsed ? 'none' : '1px solid var(--border-color)',
    transition: 'width 200ms ease, min-width 200ms ease, opacity 150ms ease',
  }}
>
```

---

### Task 7: Verify & type check

**Step 1: Run TypeScript check**

Run: `cd /Users/mufin/Documents/claude-management/claude-ui/claude-alive && pnpm --filter=@claude-alive/ui exec tsc --noEmit`
Expected: No errors

**Step 2: Run dev server and visually verify**

Run: `cd /Users/mufin/Documents/claude-management/claude-ui/claude-alive && pnpm run dev`

Verify:
- [ ] Left toggle button visible in header, left of title
- [ ] Right toggle button visible in header, right of language toggle
- [ ] Clicking left toggle smoothly collapses/expands ProjectSidebar
- [ ] Clicking right toggle smoothly collapses/expands RightPanel
- [ ] Central content expands to fill available space
- [ ] Toggle icons change fill state (filled=open, outline=closed)
- [ ] Both panels default to open on page load

**Step 3: Commit**

```bash
git add packages/i18n/src/locales/en.json packages/i18n/src/locales/ko.json packages/ui/src/App.tsx packages/ui/src/components/HeaderBar.tsx packages/ui/src/views/pixel/PixelOfficePage.tsx packages/ui/src/views/unified/ProjectSidebar.tsx packages/ui/src/views/unified/RightPanel.tsx
git commit -m "feat: add collapsible sidebars with header toggle buttons"
```
