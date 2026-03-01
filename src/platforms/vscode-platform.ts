// src/platforms/vscode-platform.ts
// VS Code implementation of the Platform interface.
import * as vscode from "vscode";
import { Platform, DiagnosticItem, DiagnosticSeverity } from "../platform";

export class VscodePlatform implements Platform {
  clipboard = {
    writeText: (text: string): Promise<void> =>
      Promise.resolve(vscode.env.clipboard.writeText(text)),
    readText: (): Promise<string> => Promise.resolve(vscode.env.clipboard.readText()),
  };

  message = {
    info: (msg: string): void => {
      vscode.window.showInformationMessage(msg);
    },
    warn: (msg: string): void => {
      vscode.window.showWarningMessage(msg);
    },
    error: (msg: string): void => {
      vscode.window.showErrorMessage(msg);
    },
  };

  getConfig<T>(key: string, defaultValue: T): T {
    return vscode.workspace.getConfiguration("clipster").get<T>(key, defaultValue);
  }

  getWorkspaceRoot(): string | null {
    return vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath ?? null;
  }

  getDiagnostics(filePath: string): DiagnosticItem[] {
    const uri = vscode.Uri.file(filePath);
    return vscode.languages.getDiagnostics(uri).map((d) => ({
      severity: d.severity as unknown as DiagnosticSeverity,
      message: d.message,
      range: { start: { line: d.range.start.line } },
      code: typeof d.code === "object" && d.code !== null ? String(d.code.value) : d.code,
      source: d.source,
    }));
  }
}
