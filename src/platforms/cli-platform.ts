// src/platforms/cli-platform.ts
// Node.js/CLI implementation of the Platform interface.
// Diagnostics are skipped (always returns []) — no language server in CLI context.
import { Platform, DiagnosticItem } from "../platform";

export class CliPlatform implements Platform {
  clipboard = {
    writeText: async (text: string): Promise<void> => {
      process.stdout.write(text);
    },
    readText: async (): Promise<string> => "",
  };

  message = {
    info: (msg: string): void => {
      process.stderr.write(`[info]  ${msg}\n`);
    },
    warn: (msg: string): void => {
      process.stderr.write(`[warn]  ${msg}\n`);
    },
    error: (msg: string): void => {
      process.stderr.write(`[error] ${msg}\n`);
    },
  };

  getConfig<T>(_key: string, defaultValue: T): T {
    return defaultValue;
  }

  getWorkspaceRoot(): string | null {
    return process.cwd();
  }

  getDiagnostics(_filePath: string): DiagnosticItem[] {
    return [];
  }
}
