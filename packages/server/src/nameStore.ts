import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const NAMES_FILE = join(homedir(), '.claude-alive', 'agent-names.json');

type NameMap = Record<string, string>;

let cached: NameMap = {};

export async function loadNames(): Promise<NameMap> {
  try {
    const raw = await readFile(NAMES_FILE, 'utf-8');
    cached = JSON.parse(raw) as NameMap;
  } catch {
    cached = {};
  }
  return cached;
}

export function getNames(): NameMap {
  return cached;
}

export async function saveName(sessionId: string, name: string): Promise<void> {
  cached[sessionId] = name;
  await flush();
}

export async function removeName(sessionId: string): Promise<void> {
  delete cached[sessionId];
  await flush();
}

async function flush(): Promise<void> {
  await mkdir(join(homedir(), '.claude-alive'), { recursive: true });
  await writeFile(NAMES_FILE, JSON.stringify(cached, null, 2));
}
