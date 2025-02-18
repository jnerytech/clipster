// File: src/extension.js
// Version: 2.11.6

const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const logger = require("./logger.js");
const {
  getFolderStructure,
  getFolderStructureAndContent,
  copyRootFolderPath,
  copyRootFolderStructure,
  copyRootFolderStructureAndContent,
  copyFilecopyFileContentWithPath,
  createFileOrFolderFromClipboard,
} = require("./fileHelpers.js");
const { copyToClipboard } = require("./clipboardHelper.js");
const {
  copyFileToClipboard,
  pasteFileFromClipboard,
  isFile,
} = require("./fileUtils.js");

let disposables = [];
const moduleName = "extension";

function registerConditionalCommand(commandName, configKey, handler) {
  const config = vscode.workspace.getConfiguration("clipster");
  if (config.get(configKey, true)) {
    disposables.push(vscode.commands.registerCommand(commandName, handler));
  }
}

function registerCommands() {
  logger.log("🛠 Registering Clipster commands...", moduleName, __filename);

  const config = vscode.workspace.getConfiguration("clipster");
  const additionalIgnores = config.get("additionalIgnores", []);

  disposables.forEach((d) => d.dispose());
  disposables = [];

  if (config.get("clipster.showSystemCopyPaste", true)) {
    registerConditionalCommand(
      "clipster.copyFile",
      "clipster.showCopyFile",
      async () => {
        try {
          await copyFileToClipboard(...arguments);
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to copy file: ${error.message}`
          );
          logger.error(
            `Failed to copy file: ${error.message}`,
            moduleName,
            __filename
          );
        }
      }
    );

    registerConditionalCommand(
      "clipster.pasteFile",
      "clipster.showPasteFile",
      async () => {
        try {
          await pasteFileFromClipboard(...arguments);
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to paste file: ${error.message}`
          );
          logger.error(
            `Failed to paste file: ${error.message}`,
            moduleName,
            __filename
          );
        }
      }
    );
  }

  // Create File from Clipboard
  registerConditionalCommand(
    "clipster.createFileFromClipboard",
    "clipster.showCreateFileFromClipboard",
    async (uri) => {
      try {
        const clipboardContent = await vscode.env.clipboard.readText();
        const lines = clipboardContent
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        if (!lines.length) {
          throw new Error("Clipboard content is empty");
        }
        await createFileOrFolderFromClipboard(lines.join("\n"), uri);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to create files or folders: ${error.message}`
        );
        logger.error(
          `Failed to create files or folders: ${error.message}`,
          moduleName,
          __filename
        );
      }
    }
  );

  registerConditionalCommand(
    "clipster.copyFolderStructure",
    "clipster.showCopyFolderStructure",
    async (uri) => {
      try {
        if (!uri) {
          throw new Error("No URI received for copyFolderStructure");
        }
        const folderPath = isFile(uri.fsPath)
          ? path.dirname(uri.fsPath)
          : uri.fsPath;
        const result = getFolderStructure(folderPath, additionalIgnores);

        await copyToClipboard(result, "📁 Folder structure copied!");
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to copy folder structure: ${error.message}`
        );
        logger.error(
          `Failed to copy copyFolderStructure: ${error.message}`,
          moduleName,
          __filename
        );
      }
    }
  );

  vscode.commands.registerCommand(
    "clipster.copyFolderStructureAndContent",
    async (uri) => {
      logger.log(
        `🔍 Received URI: ${JSON.stringify(uri)}`,
        "copyFolderStructureAndContent",
        __filename
      );

      if (!uri) {
        logger.error(
          "⚠️ No URI received! Falling back to workspace root.",
          "copyFolderStructureAndContent",
          __filename
        );
        uri = vscode.workspace.workspaceFolders?.[0]?.uri;
      }
      if (!uri) {
        vscode.window.showErrorMessage(
          "No folder selected and no workspace found."
        );
        return;
      }

      try {
        const folderPath = isFile(uri.fsPath)
          ? path.dirname(uri.fsPath)
          : uri.fsPath;
        const result = getFolderStructureAndContent(
          folderPath,
          additionalIgnores
        );
        await copyToClipboard(
          result,
          "📁 Folder structure and content copied successfully!"
        );
        logger.log(
          "✅ Folder structure and content copied successfully!",
          "copyFolderStructureAndContent",
          __filename
        );
      } catch (error) {
        logger.error(
          `❌ Error copying folder structure and content: ${error.message}`,
          "copyFolderStructureAndContent",
          __filename
        );
        vscode.window.showErrorMessage(
          `Failed to copy folder structure and content: ${error.message}`
        );
      }
    }
  );

  // <-- The fully inlined approach for Root Folder Path
  registerConditionalCommand(
    "clipster.copyRootFolderPath",
    "clipster.showCopyRootFolderPath",
    async () => {
      try {
        const rootPath = copyRootFolderPath();

        if (typeof rootPath !== "string" || rootPath.trim() === "") {
          throw new Error("No valid workspace path found");
        }

        // Add formatting here instead of in fileHelpers
        const formattedPath = `📁 Root Path: ${rootPath}`;
        await copyToClipboard(formattedPath, "📁 Root path copied!");
      } catch (error) {
        vscode.window.showErrorMessage(error.message);
        logger.error(error.message, moduleName, __filename);
      }
    }
  );

  registerConditionalCommand(
    "clipster.copyRootFolderStructure",
    "clipster.showCopyRootFolderStructure",
    async () => {
      try {
        const result = copyRootFolderStructure(additionalIgnores);
        await copyToClipboard(result, "📁 Root folder structure copied!");
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to copy root folder structure: ${error.message}`
        );
        logger.error(
          `Failed to copy copyRootFolderStructure: ${error.message}`,
          moduleName,
          __filename
        );
      }
    }
  );

  registerConditionalCommand(
    "clipster.copyRootFolderStructureAndContent",
    "clipster.showCopyRootFolderStructureAndContent",
    async () => {
      try {
        const result = copyRootFolderStructureAndContent(additionalIgnores);
        await copyToClipboard(
          result,
          "📁 Root folder structure and content copied!"
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to copy root folder structure and content: ${error.message}`
        );
        logger.error(
          `Failed to copy copyRootFolderStructureAndContent: ${error.message}`,
          moduleName,
          __filename
        );
      }
    }
  );

  registerConditionalCommand(
    "clipster.copyFileContentWithHeader",
    "clipster.showCopyFileContentWithHeader",
    async (uri, uris) => {
      try {
        const targets = Array.isArray(uris) ? uris : [uri];
        await copyFileContentWithPath(targets);
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to copy file content with header: ${error.message}`
        );
        logger.error(
          `Failed to copy file content with header: ${error.message}`,
          moduleName,
          __filename
        );
      }
    }
  );

  logger.log("✅ Commands registered.", moduleName, __filename);
}

function activate(context) {
  logger.log("🔥 Clipster is activating...", moduleName, __filename);
  registerCommands();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("clipster")) {
        registerCommands();
      }
    }),
    new vscode.Disposable(() => disposables.forEach((d) => d.dispose()))
  );

  logger.log("✅ Clipster successfully activated!", moduleName, __filename);
}

function deactivate() {
  logger.log("🛑 Clipster is deactivating...", moduleName, __filename);
  disposables.forEach((d) => d.dispose());
  disposables = [];
}

module.exports = {
  activate,
  deactivate,
};
