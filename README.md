<p align="center">
  <h1 align="center">claude-alive</h1>
  <p align="center">Real-time animated Live2D dashboard for Claude Code sessions</p>
</p>

<p align="center">
  <a href="#install">Install</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#development">Development</a> •
  <a href="#contributing">Contributing</a> •
  <a href="LICENSE">License</a>
</p>

---

Every [Claude Code hook](https://docs.anthropic.com/en/docs/claude-code/hooks) event — tool use, permission requests, sub-agent spawns, session lifecycle — is captured and streamed to a local web UI via WebSocket. Live2D characters visualize each agent's state (coding, reading, waiting, errors) with animations and speech bubbles.

Supports English / Korean.

## Install

### npm (recommended)

```bash
npm install -g @hoyoungyang0526/claude-alive --registry=https://npm.pkg.github.com

# Register hooks with Claude Code
claude-alive install

# Download Live2D models (proprietary, see below)
# Clone this repo first, then run:
bash scripts/setup-live2d.sh

# Start the dashboard
claude-alive start
```

Open http://localhost:3141 — any running Claude Code session will appear automatically.

### From source

```bash
git clone https://github.com/hoyoungyang0526/claude-alive.git
cd claude-alive

pnpm install
pnpm build

# Download Live2D models
bash scripts/setup-live2d.sh

# Register hooks
node packages/cli/dist/index.js install

# Start
node packages/server/dist/index.js
```

Open http://localhost:3141.

## CLI

```
claude-alive install     Register hooks in ~/.claude/settings.json
claude-alive uninstall   Remove hooks
claude-alive start       Start the server (http://localhost:3141)
claude-alive status      Check if server is running
```

## How It Works

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

1. **Hooks** — Shell scripts registered in `~/.claude/settings.json`. Claude Code fires them on every lifecycle event.
2. **Server** — Receives events via HTTP, broadcasts to connected clients via WebSocket, serves the UI as static files.
3. **Core** — Agent state machine, event types, session store, tool→animation mapper.
4. **UI** — Live2D character view with project sidebar, activity panel, and event stream.

### Agent State Machine

```
spawning → listening → active → idle
                ↓         ↓
             waiting    error → active
                ↓
              done → despawning → removed
```

Transitions are driven by hook events: `PreToolUse` → active, `PermissionRequest` → waiting, `Stop` → idle, `SessionEnd` → despawning.

## Live2D Setup

Live2D Cubism SDK Core and sample models are **proprietary** and cannot be bundled with this project. Run the setup script to download them:

```bash
bash scripts/setup-live2d.sh
```

By running this script you agree to the [Live2D Proprietary Software License](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html) and the [Live2D Free Material License](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html).

The script downloads:
- Cubism Core SDK (`live2dcubismcore.min.js`)
- Sample models: Haru, Hiyori, Mark, Natori, Rice

Files are placed in `packages/ui/public/live2d/` and excluded from git.

## Development

### Prerequisites

- Node.js ≥ 20
- pnpm

### Project Structure

```
claude-alive/
├── packages/
│   ├── core       # Agent types, FSM, session store, WS protocol
│   ├── server     # HTTP + WebSocket server
│   ├── hooks      # Hook installer for ~/.claude/settings.json
│   ├── cli        # CLI commands (install/uninstall/start/status)
│   ├── i18n       # EN/KO translations (i18next)
│   └── ui         # React + Live2D web app
├── npm/           # esbuild entry points for npm package
└── scripts/       # Build & setup scripts
```

### Commands

```bash
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm dev              # Dev mode with hot reload
pnpm --filter=@claude-alive/ui exec tsc --noEmit   # Type check UI
```

### Tech Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Backend**: Node.js, `ws`, zero frameworks
- **Frontend**: React 19, Vite 6, Tailwind CSS 4, i18next
- **Live2D**: PixiJS v8 + pixi-live2d-display

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes
4. Push and open a Pull Request

Please keep PRs focused — one feature or fix per PR.

## License

[MIT](LICENSE)

Live2D SDK and models are licensed separately under [Live2D proprietary licenses](https://www.live2d.com/en/sdk/about/) and are not included in this repository.
