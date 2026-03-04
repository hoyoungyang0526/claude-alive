import * as pty from 'node-pty';
import { homedir } from 'node:os';

/** Environment variables that must be removed to avoid nested-session errors */
const CLAUDE_ENV_KEYS = ['CLAUDECODE', 'CLAUDE_CODE_SSE_PORT', 'CLAUDE_CODE_ENTRYPOINT'];

function cleanEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && !CLAUDE_ENV_KEYS.includes(k)) {
      env[k] = v;
    }
  }
  return env;
}

function userShell(): string {
  return process.env.SHELL || '/bin/zsh';
}

export class ClaudeTerminal {
  private ptyProc: pty.IPty | null = null;
  private onData: ((data: string) => void) | null = null;

  spawn(handler: (data: string) => void, cols = 80, rows = 24, onExit?: (code: number) => void, cwd?: string, skipPermissions?: boolean): void {
    if (this.ptyProc) {
      this.ptyProc.kill();
      this.ptyProc = null;
    }

    this.onData = handler;

    const claudeCmd = skipPermissions ? 'claude --dangerously-skip-permissions' : 'claude';
    this.ptyProc = pty.spawn(userShell(), ['-l', '-c', claudeCmd], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: cwd || homedir(),
      env: cleanEnv(),
    });

    this.ptyProc.onData((data) => {
      this.onData?.(data);
    });

    this.ptyProc.onExit(({ exitCode }) => {
      this.ptyProc = null;
      onExit?.(exitCode);
    });
  }

  write(data: string): void {
    this.ptyProc?.write(data);
  }

  resize(cols: number, rows: number): void {
    this.ptyProc?.resize(cols, rows);
  }

  get isAlive(): boolean {
    return this.ptyProc !== null;
  }

  destroy(): void {
    if (this.ptyProc) {
      this.ptyProc.kill();
      this.ptyProc = null;
    }
    this.onData = null;
  }
}
