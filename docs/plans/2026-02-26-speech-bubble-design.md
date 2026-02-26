# Anthropomorphic Speech Bubble Design

## Summary
Add text speech bubbles above agent characters in Pixel Office, showing anthropomorphic status text that combines humanized behavior descriptions with actual tool/task info.

## Approach
Extend existing `drawBubble()` in `character.ts` (Approach A). No server changes needed.

## Data Model
- Add `bubbleText: string | null` to `Character` interface
- When `bubbleText` is set, render text speech bubble instead of icon bubble
- When `null`, fall back to existing icon bubble behavior

## Text Mapping
FE generates text from `(state, tool, animation)` via `getAnthropomorphicText()`:

| State | Tool/Animation | Text |
|-------|---------------|------|
| active | typing | "열심히 코드 작성 중..." |
| active | reading | "{tool} 읽는 중..." |
| active | running | "테스트 돌리는 중..." |
| active | searching | "파일 찾는 중..." |
| active | thinking | "음... 생각 중..." |
| waiting | - | "허락 기다리는 중~" |
| error | - | "뭔가 잘못됐다...!" |
| idle | - | null (no bubble) |
| listening | - | "듣고 있어요!" |

## Rendering
- Pixel-art style rectangular bubble with tail pointing to character head
- Background: white (#fff), Border: 1px black (#000)
- Small system font for text
- Replaces existing circle icon when `bubbleText` is present

## Files to Change
1. `character.ts` — `bubbleText` field, `drawSpeechBubble()`, `getAnthropomorphicText()`
2. `PixelView.tsx` — Set `bubbleText` in `agent:state` handler
3. `officeState.ts` — Initialize `bubbleText: null` in `spawnCharacter()`
