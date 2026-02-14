import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_PATH = path.join(os.homedir(), '.miniuberrc.json');

interface Config {
  riderToken?: string;
  driverToken?: string;
  baseUrl: string;
}

function load(): Config {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return { baseUrl: 'http://localhost:3000', ...JSON.parse(raw) };
  } catch {
    return { baseUrl: 'http://localhost:3000' };
  }
}

function save(config: Config): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getToken(role: 'rider' | 'driver'): string | undefined {
  const cfg = load();
  return role === 'rider' ? cfg.riderToken : cfg.driverToken;
}

export function saveToken(role: 'rider' | 'driver', token: string): void {
  const cfg = load();
  if (role === 'rider') cfg.riderToken = token;
  else cfg.driverToken = token;
  save(cfg);
}

export function clearTokens(): void {
  const cfg = load();
  delete cfg.riderToken;
  delete cfg.driverToken;
  save(cfg);
}

export function getBaseUrl(): string {
  return load().baseUrl;
}

export function setBaseUrl(url: string): void {
  const cfg = load();
  cfg.baseUrl = url;
  save(cfg);
}
