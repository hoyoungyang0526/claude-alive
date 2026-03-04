# Collapsible Sidebars Design

## Overview

좌/우 사이드바에 접힘(collapse) 기능을 추가하여 유저가 메인 콘텐츠에 집중할 수 있게 한다. 상단 HeaderBar에서 Cursor 스타일 아이콘 버튼으로 토글을 관리한다.

## Requirements

- 왼쪽 ProjectSidebar(300px) / 오른쪽 RightPanel(360px) 각각 독립적으로 접힘 가능
- 접힘 시 완전히 숨김 (0px)
- 부드러운 슬라이드 애니메이션 (~200ms)
- HeaderBar에 통일된 토글 아이콘 버튼 배치
- i18n 지원 (aria-label)

## Architecture

### State Management

App.tsx에서 `leftPanelOpen` / `rightPanelOpen` boolean state 관리.

```
App.tsx
├── HeaderBar({ leftOpen, rightOpen, onToggleLeft, onToggleRight })
└── PixelOfficePage({ leftPanelOpen, rightPanelOpen })
    ├── ProjectSidebar (width: leftPanelOpen ? 300 : 0)
    ├── Central (flex: 1, auto-expands)
    └── RightPanel (width: rightPanelOpen ? 360 : 0)
```

### HeaderBar Layout

```
┌──────────────────────────────────────────────────┐
│ [◧] claude-alive                    [EN/한] [◨] │
└──────────────────────────────────────────────────┘
```

- Left: 왼쪽 사이드바 토글 아이콘 → 타이틀
- Right: 언어 토글 → 오른쪽 패널 토글 아이콘
- 아이콘 상태: 열림=채워짐, 닫힘=비워짐 (시각적 피드백)
- hover: `var(--bg-card)` 배경, 기존 버튼 스타일과 통일

### Animation

- CSS transition: `width 200ms ease, opacity 150ms ease`
- overflow: hidden으로 콘텐츠 클리핑
- 중앙 영역은 flex-1이므로 자연스럽게 확장/축소

### i18n Keys

- `sidebar.toggleLeft`: "Toggle left panel" / "왼쪽 패널 토글"
- `sidebar.toggleRight`: "Toggle right panel" / "오른쪽 패널 토글"

## Files to Modify

1. `packages/ui/src/App.tsx` — state 추가, props 전달
2. `packages/ui/src/components/HeaderBar.tsx` — 토글 버튼 추가
3. `packages/ui/src/views/pixel/PixelOfficePage.tsx` — props 수신, 사이드바에 전달
4. `packages/ui/src/views/unified/ProjectSidebar.tsx` — transition 스타일 추가
5. `packages/ui/src/views/unified/RightPanel.tsx` — transition 스타일 추가
6. `packages/i18n/src/locales/en.json` — 번역 키 추가
7. `packages/i18n/src/locales/ko.json` — 번역 키 추가
