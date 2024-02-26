export { read } from "./read";
export { write } from "./write";
export { exec } from "./exec";
export { log } from "./log";

export type { Adapter };
type Adapter = {
  read: (args: { path: string; fallback: string }) => Promise<string>;
  write: (args: { path: string; input: string }) => Promise<void>;
  exec: (args: { command: string[]; stdin: string; env: Record<string, string>; log: Logger }) => Promise<void>;
  log: Logger;
};

type Logger = {
  info: Log;
  warn: Log;
  error: Log;
  success: Log;
};

type Log = (message: string, options?: { label: boolean }) => void;
