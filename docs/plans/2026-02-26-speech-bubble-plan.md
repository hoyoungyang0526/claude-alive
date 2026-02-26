# Anthropomorphic Speech Bubble Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add pixel-art text speech bubbles above agent characters in Pixel Office, showing anthropomorphic status text derived from agent state + tool info.

**Architecture:** Extend the existing `drawBubble()` system in `character.ts`. Add `bubbleText` field to `Character`, a text-mapping function `getAnthropomorphicText()`, and a new `drawSpeechBubble()` renderer. `PixelView.tsx` sets `bubbleText` on each `agent:state` WS message. No server changes.

**Tech Stack:** TypeScript, Canvas 2D API, existing pixel engine

---

### Task 1: Add `bubbleText` field to Character interface

**Files:**
- Modify: `packages/ui/src/views/pixel/engine/character.ts:47-48`

**Step 1: Add field to interface**

In the `Character` interface, add `bubbleText` below the existing `bubble` field:

```typescript
  // Speech bubble
  bubble: 'none' | 'waiting' | 'permission' | 'error';
  bubbleText: string | null;
```

**Step 2: Initialize field in `createCharacter()`**

In `createCharacter()` (line ~107), add `bubbleText: null` after `bubble: 'none'`:

```typescript
    bubble: 'none',
    bubbleText: null,
```

**Step 3: Clear field in `setCharacterIdle()`**

In `setCharacterIdle()` (line ~317), add `char.bubbleText = null` after `char.bubble = 'none'`:

```typescript
export function setCharacterIdle(char: Character): void {
  char.state = 'idle';
  char.animFrame = 0;
  char.animTimer = 0;
  char.wanderTimer = randomWanderTime();
  char.bubble = 'none';
  char.bubbleText = null;
}
```

**Step 4: Verify types compile**

Run: `npx tsc --noEmit --project packages/ui/tsconfig.json`
Expected: No errors (field is `null` everywhere, no consumers yet)

**Step 5: Commit**

```bash
git add packages/ui/src/views/pixel/engine/character.ts
git commit -m "feat(pixel): add bubbleText field to Character interface"
```

---

### Task 2: Add `getAnthropomorphicText()` mapping function

**Files:**
- Modify: `packages/ui/src/views/pixel/engine/character.ts`

**Step 1: Add the mapping function**

Add this exported function after `setCharacterIdle()` (after line ~318), before the `// ── Rendering` section:

```typescript
/** Map agent state + tool info to anthropomorphic speech bubble text */
export function getAnthropomorphicText(
  state: string,
  tool: string | null,
  animation: string | null,
): string | null {
  switch (state) {
    case 'active':
      switch (animation) {
        case 'reading':
          return tool ? `${tool} 읽는 중...` : '읽는 중...';
        case 'searching':
          return '파일 찾는 중...';
        case 'running':
          return tool === 'Bash' ? '명령어 실행 중...' : '테스트 돌리는 중...';
        case 'thinking':
          return '음... 생각 중...';
        case 'typing':
        default:
          return '열심히 코드 작성 중...';
      }
    case 'waiting':
      return '허락 기다리는 중~';
    case 'error':
      return '뭔가 잘못됐다...!';
    case 'listening':
      return '듣고 있어요!';
    default:
      return null;
  }
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit --project packages/ui/tsconfig.json`
Expected: No errors

**Step 3: Commit**

```bash
git add packages/ui/src/views/pixel/engine/character.ts
git commit -m "feat(pixel): add getAnthropomorphicText() mapping function"
```

---

### Task 3: Add `drawSpeechBubble()` renderer

**Files:**
- Modify: `packages/ui/src/views/pixel/engine/character.ts`

**Step 1: Add the speech bubble drawing function**

Add after the existing `drawBubble()` function (after line ~438):

```typescript
function drawSpeechBubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  charWidth: number,
  zoom: number,
) {
  const fontSize = Math.max(7, 3.5 * zoom);
  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText(text).width;
  const padX = 4 * zoom;
  const padY = 3 * zoom;
  const bubbleW = textWidth + padX * 2;
  const bubbleH = fontSize + padY * 2;
  const tailH = 3 * zoom;

  const bx = charWidth / 2 - bubbleW / 2;
  const by = -bubbleH - tailH - 4 * zoom;

  // Bubble body (pixel-art: sharp corners)
  ctx.fillStyle = '#fff';
  ctx.fillRect(bx, by, bubbleW, bubbleH);

  // Border
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(1, zoom * 0.5);
  ctx.strokeRect(bx, by, bubbleW, bubbleH);

  // Tail (small triangle pointing down)
  const tailX = charWidth / 2;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(tailX - 2 * zoom, by + bubbleH);
  ctx.lineTo(tailX, by + bubbleH + tailH);
  ctx.lineTo(tailX + 2 * zoom, by + bubbleH);
  ctx.closePath();
  ctx.fill();

  // Tail border (left and right edges only)
  ctx.strokeStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(tailX - 2 * zoom, by + bubbleH);
  ctx.lineTo(tailX, by + bubbleH + tailH);
  ctx.lineTo(tailX + 2 * zoom, by + bubbleH);
  ctx.stroke();

  // Text
  ctx.fillStyle = '#333';
  ctx.fillText(text, charWidth / 2, by + bubbleH / 2);
}
```

**Step 2: Update `makeRenderFn()` to use speech bubble**

Replace the speech bubble section in `makeRenderFn()` (lines ~351-354):

Old:
```typescript
    // Speech bubble
    if (char.bubble !== 'none') {
      drawBubble(ctx, char.bubble, w, zoom);
    }
```

New:
```typescript
    // Speech bubble
    if (char.bubbleText) {
      drawSpeechBubble(ctx, char.bubbleText, w, zoom);
    } else if (char.bubble !== 'none') {
      drawBubble(ctx, char.bubble, w, zoom);
    }
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit --project packages/ui/tsconfig.json`
Expected: No errors

**Step 4: Commit**

```bash
git add packages/ui/src/views/pixel/engine/character.ts
git commit -m "feat(pixel): add drawSpeechBubble() pixel-art text renderer"
```

---

### Task 4: Wire up `bubbleText` in PixelView.tsx

**Files:**
- Modify: `packages/ui/src/views/pixel/PixelView.tsx:8`
- Modify: `packages/ui/src/views/pixel/PixelView.tsx:158-186`

**Step 1: Add import**

Update the import from `character.ts` (line 8):

Old:
```typescript
import { startToolActivity, setCharacterIdle } from './engine/character';
```

New:
```typescript
import { startToolActivity, setCharacterIdle, getAnthropomorphicText } from './engine/character';
```

**Step 2: Set bubbleText in agent:state handler**

In the `agent:state` handler (lines ~158-186), set `char.bubbleText` for each state transition:

Replace the entire `case 'agent:state'` block:

```typescript
        case 'agent:state': {
          const char = officeState.characters.get(msg.sessionId);
          if (!char) break;

          // Set anthropomorphic speech bubble text
          char.bubbleText = getAnthropomorphicText(msg.state, msg.tool, msg.animation);

          switch (msg.state) {
            case 'active': {
              const anim = mapToolAnimation(msg.animation);
              startToolActivity(char, anim, officeState.tileMap);
              char.bubble = 'none';
              break;
            }
            case 'idle':
            case 'done':
              setCharacterIdle(char);
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
          break;
        }
```

**Step 3: Set bubbleText on snapshot restore**

In the `snapshot` handler (lines ~137-149), add `bubbleText` when restoring agent state:

After `char.bubble = 'error'` (line ~146), also set bubbleText:

```typescript
          for (const agent of msg.agents) {
            if (!officeState.characters.has(agent.sessionId)) {
              const char = spawnCharacter(officeState, agent.sessionId);
              // Restore anthropomorphic text for active agents
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
            }
          }
```

**Step 4: Verify types compile**

Run: `npx tsc --noEmit --project packages/ui/tsconfig.json`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/ui/src/views/pixel/PixelView.tsx
git commit -m "feat(pixel): wire up anthropomorphic speech bubbles in PixelView"
```

---

### Task 5: Visual verification

**Step 1: Run dev server**

Run: `pnpm run dev`

**Step 2: Verify visually**

- Open browser to the Pixel Office view
- Trigger agent state changes (start a Claude Code session or mock data)
- Confirm: text speech bubbles appear above characters with anthropomorphic text
- Confirm: bubbles disappear when agent goes idle
- Confirm: existing icon bubbles still work as fallback
- Confirm: text is readable at different zoom levels

**Step 3: Final commit (if any adjustments needed)**

```bash
git add -A
git commit -m "feat(pixel): anthropomorphic speech bubble system complete"
```
