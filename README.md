<p align="center">
  <h1 align="center">claude-alive</h1>
  <p align="center">
    Real-time animated Live2D dashboard for Claude Code sessions<br/>
    Claude Code 세션을 실시간 Live2D 캐릭터로 시각화하는 대시보드
  </p>
</p>

<p align="center">
  <a href="#install--설치">Install</a> •
  <a href="#how-it-works--작동-원리">How It Works</a> •
  <a href="#features--주요-기능">Features</a> •
  <a href="#architecture--아키텍처">Architecture</a> •
  <a href="#development--개발">Development</a> •
  <a href="#contributing--기여">Contributing</a> •
  <a href="#license--라이선스">License</a>
</p>

---

## What is claude-alive? / claude-alive란?

**English**

claude-alive is an open-source monitoring dashboard that brings your Claude Code sessions to life. When Claude Code runs — writing code, reading files, running tests, spawning sub-agents — you normally only see text scrolling in a terminal. claude-alive captures every one of those lifecycle events through [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) and transforms them into an animated Live2D character display.

Each Claude Code agent is represented by a Live2D (anime-style) character on screen. The character's expression, pose, and animation reflect what the agent is currently doing: typing when writing code, looking around when searching files, showing concern when encountering errors, and celebrating when tasks complete. Speech bubbles show the current tool being used. Multiple agents (including sub-agents) appear simultaneously, so you can watch an entire multi-agent session unfold visually.

Everything is local — no data leaves your machine. The server runs on `localhost:3141` and only accepts connections from localhost.

**한국어**

claude-alive는 Claude Code 세션을 실시간으로 시각화하는 오픈소스 모니터링 대시보드입니다. Claude Code가 코드를 작성하고, 파일을 읽고, 테스트를 실행하고, 서브에이전트를 생성할 때 — 터미널에서는 텍스트만 보이지만, claude-alive는 [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)를 통해 모든 라이프사이클 이벤트를 캡처하고 이를 애니메이션 Live2D 캐릭터로 변환합니다.

각 Claude Code 에이전트는 화면에 Live2D(일본 애니메이션 스타일) 캐릭터로 나타납니다. 캐릭터의 표정, 자세, 애니메이션은 에이전트의 현재 작업을 반영합니다: 코드를 작성할 때는 타이핑, 파일을 검색할 때는 두리번거리기, 에러가 발생하면 걱정스러운 표정, 작업 완료 시에는 기쁜 표정. 말풍선은 현재 사용 중인 도구를 표시합니다. 서브에이전트를 포함한 여러 에이전트가 동시에 화면에 나타나서, 멀티에이전트 세션의 전체 흐름을 시각적으로 관찰할 수 있습니다.

모든 데이터는 로컬에서만 처리됩니다. 서버는 `localhost:3141`에서 실행되며, localhost 연결만 허용합니다.

---

## Install / 설치

### npm (recommended / 권장)

```bash
npm install -g @hoyoungyang0526/claude-alive --registry=https://npm.pkg.github.com

# Register hooks with Claude Code / Claude Code에 훅 등록
claude-alive install

# Start the dashboard / 대시보드 시작
claude-alive start
```

Open http://localhost:3141 — any running Claude Code session will appear automatically.

http://localhost:3141 을 열면 실행 중인 Claude Code 세션이 자동으로 나타납니다.

### From source / 소스에서 빌드

```bash
git clone https://github.com/hoyoungyang0526/claude-alive.git
cd claude-alive

pnpm install
pnpm build

# Download Live2D models / Live2D 모델 다운로드
bash scripts/setup-live2d.sh

# Register hooks / 훅 등록
node packages/cli/dist/index.js install

# Start / 서버 시작
node packages/server/dist/index.js
```

### CLI Commands / CLI 명령어

| Command | Description | 설명 |
|---------|-------------|------|
| `claude-alive install` | Register hooks in `~/.claude/settings.json` | 훅을 Claude Code 설정에 등록 |
| `claude-alive uninstall` | Remove hooks | 훅 제거 |
| `claude-alive start` | Start the server on port 3141 | 서버 시작 (포트 3141) |
| `claude-alive status` | Check if server is running | 서버 상태 확인 |

---

## Features / 주요 기능

### Live2D Character Visualization / Live2D 캐릭터 시각화

**EN:** Each Claude Code agent maps to a Live2D character. The system supports 5 model types (Haru, Hiyori, Mark, Natori, Rice) and automatically assigns characters to agents. Characters are arranged in a 3-row depth layout (back, mid, front) that scales dynamically based on the number of active agents.

**KO:** 각 Claude Code 에이전트가 하나의 Live2D 캐릭터에 매핑됩니다. 5종의 모델(Haru, Hiyori, Mark, Natori, Rice)을 지원하며, 에이전트에 자동으로 캐릭터가 배정됩니다. 3행 깊이 레이아웃(뒤/중간/앞)으로 배치되며 활성 에이전트 수에 따라 동적으로 스케일링됩니다.

### Real-time State Mapping / 실시간 상태 매핑

**EN:** Agent states are reflected through character animations and expressions:

| Agent State | Animation | Character Behavior |
|-------------|-----------|-------------------|
| Writing code | Typing | Fast hand movements |
| Reading files | Reading | Looking down, focused |
| Searching | Searching | Looking around |
| Running Bash | Running | Energetic movement |
| Waiting for permission | Waiting | Looking at user expectantly |
| Error encountered | Error | Worried expression |
| Idle / Listening | Idle | Relaxed, gentle breathing |
| Task complete | Done | Happy expression |

**KO:** 에이전트 상태가 캐릭터 애니메이션과 표정에 실시간으로 반영됩니다:

| 에이전트 상태 | 애니메이션 | 캐릭터 반응 |
|-------------|-----------|-----------|
| 코드 작성 중 | 타이핑 | 빠른 손 움직임 |
| 파일 읽는 중 | 읽기 | 아래를 보며 집중 |
| 검색 중 | 검색 | 주위를 두리번거림 |
| Bash 실행 중 | 실행 | 활기찬 움직임 |
| 권한 대기 중 | 대기 | 사용자를 기대하며 바라봄 |
| 에러 발생 | 에러 | 걱정스러운 표정 |
| 대기 / 수신 중 | 유휴 | 편안한 자세, 호흡 |
| 작업 완료 | 완료 | 기쁜 표정 |

### Multi-Agent Support / 멀티에이전트 지원

**EN:** When Claude Code spawns sub-agents (via the Task tool), each sub-agent appears as a new character on screen. Parent-child relationships are tracked, and when a sub-agent completes its work, the character gracefully exits. You can monitor complex multi-agent workflows where Claude delegates tasks to specialized sub-agents.

**KO:** Claude Code가 서브에이전트를 생성하면(Task 도구 사용), 각 서브에이전트가 새로운 캐릭터로 화면에 나타납니다. 부모-자식 관계가 추적되며, 서브에이전트의 작업이 끝나면 캐릭터가 자연스럽게 퇴장합니다. Claude가 전문 서브에이전트에게 작업을 위임하는 복잡한 멀티에이전트 워크플로우를 시각적으로 모니터링할 수 있습니다.

### Project Sidebar / 프로젝트 사이드바

**EN:** The left sidebar groups agents by their working directory (project). Each project shows its active agents, their current state, and the tool they're using. This gives a clear overview when Claude Code is working across multiple projects simultaneously.

**KO:** 왼쪽 사이드바는 에이전트를 작업 디렉토리(프로젝트)별로 그룹화합니다. 각 프로젝트에 활성 에이전트, 현재 상태, 사용 중인 도구가 표시됩니다. Claude Code가 여러 프로젝트에서 동시에 작업할 때 전체 상황을 한눈에 파악할 수 있습니다.

### Event Stream / 이벤트 스트림

**EN:** The right panel shows a chronological stream of all hook events as they happen — tool calls, permission requests, agent spawns/despawns, errors. Useful for debugging and understanding exactly what Claude Code is doing.

**KO:** 오른쪽 패널에 모든 훅 이벤트가 시간순으로 표시됩니다 — 도구 호출, 권한 요청, 에이전트 생성/종료, 에러 등. Claude Code가 정확히 무엇을 하고 있는지 이해하고 디버깅하는 데 유용합니다.

---

## How It Works / 작동 원리

```
Claude Code Session
  ↓ hook event (stdin JSON)
~/.claude-alive/hooks/stream-event.sh
  ↓ HTTP POST
localhost:3141/api/event
  ↓ SessionStore + FSM
WebSocket broadcast
  ↓
React UI (Live2D view)
```

### EN

1. **Hooks** — `claude-alive install` registers shell scripts in `~/.claude/settings.json`. Claude Code calls these scripts on every lifecycle event (`SessionStart`, `PreToolUse`, `PostToolUse`, `PermissionRequest`, `Stop`, `SubagentStart`, etc.), passing event data as JSON on stdin.

2. **stream-event.sh** — The hook script reads the JSON from stdin and sends it as an HTTP POST to `localhost:3141/api/event`. It runs asynchronously with a 5-second timeout, so it never blocks Claude Code.

3. **Server** — A lightweight Node.js HTTP server receives events, updates the session store (which tracks all active agents and their states), and broadcasts state changes to all connected WebSocket clients.

4. **UI** — A React app connects via WebSocket, receives agent state snapshots and updates, and renders Live2D characters using PixiJS. The state machine determines each character's animation, expression, and speech bubble.

### KO

1. **훅** — `claude-alive install`이 `~/.claude/settings.json`에 쉘 스크립트를 등록합니다. Claude Code는 모든 라이프사이클 이벤트(`SessionStart`, `PreToolUse`, `PostToolUse`, `PermissionRequest`, `Stop`, `SubagentStart` 등)에서 이 스크립트를 호출하며, stdin으로 JSON 이벤트 데이터를 전달합니다.

2. **stream-event.sh** — 훅 스크립트가 stdin에서 JSON을 읽어 `localhost:3141/api/event`로 HTTP POST 요청을 보냅니다. 비동기로 실행되고 5초 타임아웃이 설정되어 있어 Claude Code를 절대 차단하지 않습니다.

3. **서버** — 경량 Node.js HTTP 서버가 이벤트를 수신하고, 세션 스토어(모든 활성 에이전트와 상태를 추적)를 업데이트하고, 연결된 모든 WebSocket 클라이언트에 상태 변경을 브로드캐스트합니다.

4. **UI** — React 앱이 WebSocket으로 연결되어 에이전트 상태 스냅샷과 업데이트를 수신하고, PixiJS를 사용해 Live2D 캐릭터를 렌더링합니다. 상태 머신이 각 캐릭터의 애니메이션, 표정, 말풍선을 결정합니다.

### Agent State Machine / 에이전트 상태 머신

```
spawning → listening → active → idle
                ↓         ↓
             waiting    error → active
                ↓
              done → despawning → removed
```

**EN:** State transitions are driven by hook events. `PreToolUse` triggers `active`, `PermissionRequest` triggers `waiting`, `Stop` triggers `idle`, and `SessionEnd` triggers `despawning`. The FSM prevents invalid transitions and ensures characters animate smoothly between states.

**KO:** 상태 전환은 훅 이벤트에 의해 구동됩니다. `PreToolUse`는 `active`, `PermissionRequest`는 `waiting`, `Stop`은 `idle`, `SessionEnd`는 `despawning`을 트리거합니다. FSM은 잘못된 전환을 방지하고 캐릭터가 상태 간 부드럽게 애니메이션되도록 합니다.

### Supported Hook Events / 지원하는 훅 이벤트

| Event | Description | 설명 |
|-------|-------------|------|
| `SessionStart` | New Claude Code session begins | 새 Claude Code 세션 시작 |
| `SessionEnd` | Session ends | 세션 종료 |
| `UserPromptSubmit` | User sends a prompt | 사용자가 프롬프트 전송 |
| `PreToolUse` | Before a tool is called | 도구 호출 전 |
| `PostToolUse` | After a tool completes | 도구 호출 완료 후 |
| `PostToolUseFailure` | Tool call failed | 도구 호출 실패 |
| `PermissionRequest` | Waiting for user permission | 사용자 권한 대기 |
| `Stop` | Agent stops processing | 에이전트 처리 중단 |
| `Notification` | System notification | 시스템 알림 |
| `SubagentStart` | Sub-agent spawned | 서브에이전트 생성 |
| `SubagentStop` | Sub-agent completed | 서브에이전트 완료 |
| `TaskCompleted` | Task finished | 작업 완료 |
| `PreCompact` | Before context compaction | 컨텍스트 압축 전 |

---

## Live2D Setup / Live2D 설정

**EN:** Live2D Cubism SDK Core and sample models are **proprietary** and cannot be bundled with this open-source project. You must download them separately:

**KO:** Live2D Cubism SDK Core와 샘플 모델은 **독점 소프트웨어**이므로 이 오픈소스 프로젝트에 포함할 수 없습니다. 별도로 다운로드해야 합니다:

```bash
bash scripts/setup-live2d.sh
```

**EN:** By running this script you agree to the [Live2D Proprietary Software License](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html) and the [Live2D Free Material License](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html). The script downloads:

**KO:** 이 스크립트를 실행하면 [Live2D 독점 소프트웨어 라이선스](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html)와 [Live2D 무료 소재 라이선스](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html)에 동의하는 것입니다. 다운로드 항목:

- **Cubism Core SDK** — `live2dcubismcore.min.js` (rendering engine / 렌더링 엔진)
- **Sample models / 샘플 모델** — Haru, Hiyori, Mark, Natori, Rice

Files are placed in `packages/ui/public/live2d/` and excluded from git.

파일은 `packages/ui/public/live2d/`에 배치되며 git에서 제외됩니다.

---

## Architecture / 아키텍처

### Project Structure / 프로젝트 구조

```
claude-alive/
├── packages/
│   ├── core        # Agent types, FSM, session store, WS protocol
│   │               # 에이전트 타입, 상태머신, 세션 스토어, WS 프로토콜
│   ├── server      # HTTP + WebSocket server, static file serving
│   │               # HTTP + WebSocket 서버, 정적 파일 서빙
│   ├── hooks       # Hook installer for ~/.claude/settings.json
│   │               # 훅 설치기 (settings.json에 훅 등록)
│   ├── cli         # CLI: install / uninstall / start / status
│   │               # CLI 명령어
│   ├── i18n        # EN/KO translations (i18next)
│   │               # 영어/한국어 번역 (i18next)
│   └── ui          # React + PixiJS + Live2D web app
│                   # React + PixiJS + Live2D 웹 앱
├── npm/            # esbuild entry points for npm package
│                   # npm 패키지용 esbuild 엔트리 포인트
└── scripts/        # Build & setup scripts
                    # 빌드 및 설정 스크립트
```

### UI Layout / UI 레이아웃

```
┌──────────────┬──────────────────────┬───────────────┐
│              │                      │               │
│  Project     │    Live2D Canvas     │  Activity     │
│  Sidebar     │                      │  Pulse        │
│  (280px)     │   ┌──┐  ┌──┐  ┌──┐  │               │
│              │   │  │  │  │  │  │  │  Event        │
│  - Project A │   └──┘  └──┘  └──┘  │  Stream       │
│    - Agent 1 │      ┌──┐  ┌──┐     │               │
│    - Agent 2 │      │  │  │  │     │  - ToolUse    │
│  - Project B │      └──┘  └──┘     │  - Permission │
│    - Agent 3 │        ┌────┐       │  - Error      │
│              │        │    │       │  - ...        │
│              │        └────┘       │               │
│              │                      │               │
└──────────────┴──────────────────────┴───────────────┘
```

**EN:** The UI is a 3-column layout. The left sidebar shows projects and their agents. The center canvas renders Live2D characters arranged in a 3-row depth layout (back row at smaller scale, front row at larger scale, creating a sense of depth). The right panel shows real-time activity pulses and an event stream.

**KO:** UI는 3컬럼 레이아웃입니다. 왼쪽 사이드바에 프로젝트와 에이전트가 표시됩니다. 중앙 캔버스에 Live2D 캐릭터가 3행 깊이 레이아웃(뒤쪽 행은 작은 스케일, 앞쪽 행은 큰 스케일)으로 배치되어 원근감을 줍니다. 오른쪽 패널에 실시간 활동 펄스와 이벤트 스트림이 표시됩니다.

### Tech Stack / 기술 스택

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces + Turborepo |
| Backend | Node.js (no frameworks), `ws` WebSocket library |
| Frontend | React 19, Vite 6, Tailwind CSS 4 |
| Live2D | PixiJS v8 + pixi-live2d-display |
| i18n | i18next + react-i18next (EN/KO) |
| Bundling | esbuild (for npm package), Vite (for UI) |

### Security / 보안

**EN:**
- All HTTP endpoints only accept requests from `localhost` origins (CORS restricted)
- Path traversal protection on static file serving
- Request body size limited to 1MB
- No external network calls — everything runs locally

**KO:**
- 모든 HTTP 엔드포인트는 `localhost` 출처의 요청만 허용 (CORS 제한)
- 정적 파일 서빙에 경로 탐색(path traversal) 방어 적용
- 요청 본문 크기 1MB 제한
- 외부 네트워크 호출 없음 — 모든 것이 로컬에서 실행

---

## Development / 개발

### Prerequisites / 필수 조건

- Node.js ≥ 20
- pnpm

### Commands / 명령어

```bash
pnpm install          # Install dependencies / 의존성 설치
pnpm build            # Build all packages / 전체 빌드
pnpm dev              # Dev mode with hot reload / 핫 리로드 개발 모드

# Type check / 타입 체크
pnpm --filter=@claude-alive/ui exec tsc --noEmit

# Build npm package / npm 패키지 빌드
bash scripts/build-npm.sh
```

---

## Contributing / 기여

**EN:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes
4. Push and open a Pull Request

Please keep PRs focused — one feature or fix per PR.

**KO:**
1. 리포지토리를 포크합니다
2. 피처 브랜치를 생성합니다 (`git checkout -b feat/my-feature`)
3. 변경사항을 커밋합니다
4. 푸시하고 Pull Request를 엽니다

PR은 하나의 기능 또는 수정에 집중해 주세요.

---

## License / 라이선스

[MIT](LICENSE)

**EN:** Live2D SDK and models are licensed separately under [Live2D proprietary licenses](https://www.live2d.com/en/sdk/about/) and are **not included** in this repository.

**KO:** Live2D SDK와 모델은 [Live2D 독점 라이선스](https://www.live2d.com/en/sdk/about/) 하에 별도로 라이선스되며, 이 리포지토리에 **포함되지 않습니다**.
