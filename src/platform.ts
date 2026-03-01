// src/platform.ts
// Thin platform abstraction so core logic runs under both VS Code and the CLI.

export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export interface DiagnosticItem {
  severity: DiagnosticSeverity;
  message: string;
  range: { start: { line: number } };
  code?: string | number;
  source?: string;
}

export interface Platform {
  clipboard: {
    writeText(text: string): Promise<void>;
    readText(): Promise<string>;
  };
  message: {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
  };
  getConfig<T>(key: string, defaultValue: T): T;
  getWorkspaceRoot(): string | null;
  /** Returns diagnostics for the given file path. CLI always returns []. */
  getDiagnostics(filePath: string): DiagnosticItem[];
}

let _platform: Platform | null = null;

export function initPlatform(p: Platform): void {
  _platform = p;
}

export function getPlatform(): Platform {
  if (!_platform) {
    throw new Error("Platform not initialised — call initPlatform() first");
  }
  return _platform;
}
