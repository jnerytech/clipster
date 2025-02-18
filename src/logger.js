// /src/logger.js
// Version: 1.0.7

const path = require("path");

let isVsCode = false;
let outputChannel = null;
let vscode = null;

if (typeof jest === "undefined") {
  try {
    vscode = require("vscode");
    isVsCode = typeof vscode !== "undefined" && vscode.window;
    if (isVsCode) {
      outputChannel = vscode.window.createOutputChannel("Clipster Logger");
    }
  } catch (error) {
    isVsCode = false;
  }
}

// Helper to get the relative file path
const getRelativeFilePath = (absolutePath) => {
  const workspaceFolder = vscode?.workspace?.workspaceFolders?.[0]?.uri?.fsPath;
  if (workspaceFolder && absolutePath.startsWith(workspaceFolder)) {
    return path.relative(workspaceFolder, absolutePath);
  }
  return absolutePath;
};

// Logger utility with relative path tracking
const logger = {
  log: (message, moduleName = "General", filePath = null) => {
    const formattedPath = filePath
      ? ` [File: ${getRelativeFilePath(filePath)}]`
      : "";
    const formattedMessage = `✅ [${moduleName}] ${message}${formattedPath}`;

    if (isVsCode && outputChannel) {
      outputChannel.appendLine(formattedMessage);
    } else {
      console.log(formattedMessage);
    }
  },
  warn: (message, moduleName = "General", filePath = null) => {
    const formattedPath = filePath
      ? ` [File: ${getRelativeFilePath(filePath)}]`
      : "";
    const formattedMessage = `⚠️ [${moduleName}] ${message}${formattedPath}`;

    if (isVsCode && outputChannel) {
      outputChannel.appendLine(formattedMessage);
    } else {
      console.warn(formattedMessage);
    }
  },
  error: (message, moduleName = "General", filePath = null) => {
    const formattedPath = filePath
      ? ` [File: ${getRelativeFilePath(filePath)}]`
      : "";
    const formattedMessage = `❌ [${moduleName}] ${message}${formattedPath}`;

    if (isVsCode && outputChannel) {
      outputChannel.appendLine(formattedMessage);
    } else {
      console.error(formattedMessage);
    }
  },
};

module.exports = logger;
