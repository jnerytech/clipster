// src/logger.ts
import path from "path";

interface OutputChannel {
  appendLine(value: string): void;
}

let outputChannel: OutputChannel | null = null;
let getWorkspaceRoot: () => string | undefined = () => undefined;

// Avoid loading vscode (and creating an output channel) during Jest runs
if (!process.env.JEST_WORKER_ID) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const vscode = require("vscode") as typeof import("vscode");
    if (vscode?.window) {
      outputChannel = vscode.window.createOutputChannel("Clipster Logger");
      getWorkspaceRoot = () =>
        vscode?.workspace?.workspaceFolders?.[0]?.uri?.fsPath;
    }
  } catch {
    // Not running inside VS Code (e.g. unit tests without the mock)
  }
}

const getRelativeFilePath = (absolutePath: string): string => {
  const wsRoot = getWorkspaceRoot();
  if (wsRoot && absolutePath.startsWith(wsRoot)) {
    return path.relative(wsRoot, absolutePath);
  }
  return absolutePath;
};

const format = (
  level: string,
  message: string,
  moduleName: string,
  filePath?: string | null
): string => {
  const pathSuffix = filePath
    ? ` [File: ${getRelativeFilePath(filePath)}]`
    : "";
  return `[${level}] [${moduleName}] ${message}${pathSuffix}`;
};

const logger = {
  log(
    message: string,
    moduleName = "General",
    filePath?: string | null
  ): void {
    const msg = format("INFO", message, moduleName, filePath);
    outputChannel ? outputChannel.appendLine(msg) : console.log(msg);
  },
  warn(
    message: string,
    moduleName = "General",
    filePath?: string | null
  ): void {
    const msg = format("WARN", message, moduleName, filePath);
    outputChannel ? outputChannel.appendLine(msg) : console.warn(msg);
  },
  error(
    message: string,
    moduleName = "General",
    filePath?: string | null
  ): void {
    const msg = format("ERROR", message, moduleName, filePath);
    outputChannel ? outputChannel.appendLine(msg) : console.error(msg);
  },
};

export default logger;
