# CLAUDE.md

## 프로젝트 개요

claude-alive: Claude Code 에이전트 모니터링 대시보드. 실시간 WebSocket으로 에이전트 상태를 추적하고, 3D 필드 / 픽셀 오피스 / 비쇼죠(Live2D) 뷰로 시각화.

## 기술 스택

- **Monorepo**: pnpm + Turborepo
- **프론트엔드**: React 19, Vite 6, Tailwind CSS 4, TypeScript 5.7
- **3D**: Three.js (@react-three/fiber) — lazy-loaded
- **2D 픽셀**: Custom canvas engine (tilemap, BFS pathfinding, sprite system)
- **Live2D 비쇼죠**: PixiJS v8 + @naari3/pixi-live2d-display v1.2.5 — lazy-loaded
- **통신**: WebSocket 실시간 스트리밍 (`useWebSocket` hook)
- **i18n**: i18next (EN/KO)

## 아키텍처

### 통합 레이아웃 (UnifiedView)
3-Column 구조:
- **왼쪽**: `ProjectSidebar` (280px) — 프로젝트별 에이전트 그룹, 접힘/펼침
- **중앙**: 3D Field / Pixel Office / Bishoujo 캔버스 (ViewMode 전환)
- **오른쪽**: `RightPanel` (320px) — ActivityPulse + EventStream

단일 WebSocket 연결로 React 상태와 픽셀 엔진 모두 피드 (`onRawMessage` 콜백).

### 픽셀 오피스 엔진 (`views/pixel/engine/`)
- `constants.ts` — TILE_SIZE=32, 40×24 오피스, 줌 0.5~8 (0.25 스텝), 가구 색상 35개+
- `tilemap.ts` — 16개 타일 타입(VOID/FLOOR/WALL/DESK/COMPUTER/CHAIR/PLANT/BOOKSHELF/SOFA/COFFEE_MACHINE/WHITEBOARD/MEETING_TABLE/SNACK_MACHINE/POSTER/CLOCK/RUG), 4존 레이아웃, BFS pathfinding
- `renderer.ts` — 13개 가구 draw 함수 (fillRect 기반 픽셀아트), 바닥 체크보드 패턴, Z-sort 엔티티
- `sprites.ts` — 2x 스프라이트 생성 (32x64), SubAgentSpriteSet (75% 스케일)
- `character.ts` — isSubAgent/label/showTooltip/tooltipTool 필드, 이름 라벨, 클릭 툴팁, hitTest
- `seats.ts` — 12개 데스크 클러스터, Zone(A/B/C) 업무존 + Zone D 휴게실, 프로젝트별 영역 선호
- `officeState.ts` — Module-level 싱글톤, projectZones 맵, SpawnOptions
- `camera.ts` — 줌(0.5-8)/팬, screenToWorld 변환
- `matrixEffect.ts` — spawn/despawn 매트릭스 이펙트

### 픽셀 오피스 레이아웃 (40×24)
```
┌───────────────────┬──────────────────┐
│  업무존 A (좌상)   │  업무존 B (우상)  │  rows 1-10
│  데스크4클러스터    │  데스크4클러스터   │
├──── col19 벽 ─────┼── col21 벽 ──────┤
│      row 12 복도 (전체 FLOOR)         │
├───────────────────┼──────────────────┤
│  업무존 C (좌하)   │  휴게실 D (우하)  │  rows 13-22
│  데스크4클러스터    │  소파/커피/스낵   │
└───────────────────┴──────────────────┘
```
- 내벽(col 19, 21)과 수평벽(row 11, 13)으로 존 분리, 문(FLOOR) 연결
- 수직 복도 col 20, 수평 복도 row 12

### 입력 처리 (`components/PixelCanvas.tsx`)
- **좌클릭 드래그** (>5px): 카메라 패닝
- **좌클릭** (<5px): 캐릭터 선택 (onWorldClick/onTileClick)
- **미들클릭 드래그**: 패닝 (보조)
- **스크롤 휠**: 줌 인/아웃 (±0.25 스텝)

### 비쇼죠 Live2D 뷰 (`views/bishoujo/`)
- `components/BishoujoCanvas.tsx` — PixiJS v8 캔버스 + Live2D 모델 관리, 애니메이션 루프
- `components/UIOverlay.tsx` — DOM 오버레이 (이름표, 말풍선, 호버/클릭 인터랙션)
- `engine/constants.ts` — 8개 슬롯(3행: back/mid/front), 모델 카탈로그 5종(Haru/Hiyori/Mark/Natori/Rice)
- `engine/live2dManager.ts` — `window.PIXI` 설정, `Live2DModel.from()` 모델 로딩
- `engine/parameterMapper.ts` — AgentState → Live2D 파라미터 매핑 (표정/시선/자세)
- `engine/sceneLayout.ts` — 슬롯 배정 (에이전트 수 기반 레이아웃 + 소수 에이전트 자동 스케일업)
- `engine/interactionHandler.ts` — 마우스 트래킹, 클릭 반응, 드래그 상태
- `engine/moodSystem.ts` — 무드 누적 (행복/에너지/스트레스) → 표정 오프셋

#### Live2D Retina 뷰포트 핵심 이슈
라이브러리(`_onRenderCallback`)가 CSS 픽셀(`renderer.width/height`)로 viewport 설정 → Retina(devicePixelRatio=2)에서 물리 캔버스의 절반만 사용 → 모델이 좌하단 1/4에 렌더링.
**해결**: `internalModel.draw()`를 패치하여 `setRenderState` 직전에 `viewport = [0, 0, gl.canvas.width, gl.canvas.height]`로 교정. projection matrix(CSS 기반) + 물리 viewport = 정확한 좌표 매핑.

#### 슬롯 레이아웃
```
행      Y위치   스케일   캐릭터수
Back    0.28    0.06-07  3
Mid     0.52    0.09-10  3
Front   0.82    0.14     2
```
소수 에이전트 자동 스케일: 1명=2.0x, 2명=1.6x, 3명=1.3x

### 핵심 패턴
- **Module-level singleton**: `officeState`는 모듈 레벨에서 생성되어 컴포넌트 re-mount 간 유지
- **Lazy loading**: Three.js, Bishoujo 컴포넌트는 lazy-loaded (~1MB+ 절약)
- **Zone seating**: 같은 cwd(프로젝트) 에이전트는 같은 업무존(A/B/C)에 배정, D존은 휴게실
- **Procedural pixel art**: 모든 가구는 fillRect 기반 코드 렌더링 (이미지 에셋 없음), 하이라이트/그림자로 입체감 표현
- **Drag threshold**: 좌클릭에서 5px 이동 임계값으로 클릭 vs 드래그 구분
- **Live2D draw 패치**: `internalModel.draw()` 래핑으로 viewport CSS→물리 픽셀 교정 필수 (Retina)

### 주요 데이터 타입 (core 패키지)
- `AgentInfo` — sessionId, state, parentId (서브에이전트 판별), displayName, cwd, currentTool
- `WSServerMessage` — snapshot / agent:spawn / agent:despawn / agent:state / agent:prompt / event:new

## 빌드 & 실행

```bash
pnpm install
pnpm run dev          # 전체 dev 서버
pnpm run build --filter=@claude-alive/ui   # UI 빌드
pnpm --filter=@claude-alive/ui exec tsc --noEmit      # 타입 체크
```

## 프롬프트 캐싱 핵심 교훈

1. **접두사 매칭 원칙**: 프롬프트 캐싱은 접두사 매칭이며, 접두사 어디에서든 변경이 발생하면 그 이후의 모든 캐시가 무효화됨 → 전체 시스템을 이 제약 중심으로 설계해야 함
2. **시스템 메시지 삽입 우선**: 시스템 프롬프트 변경 대신 대화 중 시스템 메시지를 삽입하는 방식이 캐시 보존에 유리
3. **상태 전환은 도구로 모델링**: 대화 중간에 도구나 모델을 변경하지 말 것 → 상태 전환은 도구로 모델링하고, 도구 제거 대신 지연 로딩 활용
4. **캐시 적중률 모니터링**: 캐시 적중률을 업타임처럼 모니터링해야 하며, 수 퍼센트의 캐시 미스율도 비용과 지연에 극적인 영향
5. **포크 작업 접두사 공유**: 포크 작업(컴팩션, 요약, 스킬 실행)은 부모의 접두사를 공유해야 캐시 적중이 가능
6. **첫날부터 캐싱 중심 설계**: 에이전트를 구축한다면 첫날부터 프롬프트 캐싱 중심으로 설계해야 함
