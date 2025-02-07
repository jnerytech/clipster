// File: src/extension.js
// Version: 2.11.1

const vscode = require("vscode");
const logger = require("./logger.js");
const {
  getFolderStructure,
  getFolderStructureAndContent,
  copyRootFolderPath,
  copyRootFolderStructure,
  copyRootFolderStructureAndContent, // ✅ FIXED
  copyFileContentWithPath,
  createFileOrFolderFromClipboard,
} = require("./fileHelpers.js");
const { copyToClipboard } = require("./clipboardHelper.js");
const {
  copyFileToClipboard,
  pasteFileFromClipboard,
} = require("./fileUtils.js");

let disposables = [];

// Helper functions
const registerConditionalCommand = (commandName, configKey, handler) => {
  const config = vscode.workspace.getConfiguration("clipster");
  if (config.get(configKey, true)) {
    disposables.push(vscode.commands.registerCommand(commandName, handler));
  }
};

const withErrorHandling =
  (handler, errorMessage) =>
  async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      vscode.window.showErrorMessage(`${errorMessage}: ${error.message}`);
      logger.error(`${errorMessage}: ${error.message}`);
    }
  };

const createCopyHandler =
  (dataFn, successMessage) =>
  async (...args) => {
    const data = await dataFn(...args);
    await copyToClipboard(data, successMessage);
  };

const processClipboardContent = async () => {
  const clipboardContent = await vscode.env.clipboard.readText();
  return clipboardContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

const confirmMultiCreate = async (itemCount) => {
  if (itemCount <= 1) return true;

  const confirmation = await vscode.window.showWarningMessage(
    `You are about to create ${itemCount} items. Proceed?`,
    { modal: true },
    "Yes",
    "No"
  );
  return confirmation === "Yes";
};

// Command handlers
const createFileFromClipboardHandler = async (uri) => {
  const lines = await processClipboardContent();
  if (!lines.length) throw new Error("Clipboard content is empty");
  if (!(await confirmMultiCreate(lines.length))) return;

  await createFileOrFolderFromClipboard(lines.join("\n"), uri);
};

// Register commands function
const registerCommands = () => {
  logger.log("🛠 Registering Clipster commands...");
  const config = vscode.workspace.getConfiguration("clipster");
  const additionalIgnores = config.get("additionalIgnores", []);

  disposables.forEach((d) => d.dispose());
  disposables = [];

  // Register System Copy-Paste Commands
  if (config.get("clipster.showSystemCopyPaste", true)) {
    registerConditionalCommand(
      "clipster.copyFile",
      "clipster.showCopyFile",
      withErrorHandling(copyFileToClipboard, "Failed to copy file")
    );

    registerConditionalCommand(
      "clipster.pasteFile",
      "clipster.showPasteFile",
      withErrorHandling(pasteFileFromClipboard, "Failed to paste file")
    );
  }

  // Register Clipboard Create Command
  registerConditionalCommand(
    "clipster.createFileFromClipboard",
    "clipster.showCreateFileFromClipboard",
    withErrorHandling(
      createFileFromClipboardHandler,
      "Failed to create files or folders"
    )
  );

  // Register Copy Commands
  const registerCopyCommand = (
    commandName,
    configKey,
    handler,
    successMessage
  ) => {
    registerConditionalCommand(
      commandName,
      configKey,
      withErrorHandling(
        createCopyHandler(handler, successMessage),
        `Failed to copy ${commandName.split(".").pop()}`
      )
    );
  };

  registerCopyCommand(
    "clipster.copyFolderStructure",
    "clipster.showCopyFolderStructure",
    (uri) => getFolderStructure(uri.fsPath, additionalIgnores),
    "📁 Folder structure copied!"
  );

  registerCopyCommand(
    "clipster.copyFolderStructureAndContent",
    "clipster.showCopyFolderStructureAndContent",
    (uri) => getFolderStructureAndContent(uri.fsPath, additionalIgnores),
    "📁 Folder structure and content copied!"
  );

  registerCopyCommand(
    "clipster.copyRootFolderPath",
    "clipster.showCopyRootFolderPath",
    () => copyRootFolderPath(),
    "📁 Root folder path copied!"
  );

  registerCopyCommand(
    "clipster.copyRootFolderStructure",
    "clipster.showCopyRootFolderStructure",
    () => copyRootFolderStructure(additionalIgnores),
    "📁 Root folder structure copied!"
  );

  registerCopyCommand(
    "clipster.copyRootFolderStructureAndContent",
    "clipster.showCopyRootFolderStructureAndContent",
    () => copyRootFolderStructureAndContent(additionalIgnores),
    "📁 Root folder structure and content copied!"
  );

  registerConditionalCommand(
    "clipster.copyFileContentWithHeader",
    "clipster.showCopyFileContentWithHeader",
    withErrorHandling(
      async (uri, uris) =>
        copyFileContentWithPath(Array.isArray(uris) ? uris : [uri]),
      "Failed to copy file content with header"
    )
  );
};

// Activation function
function activate(context) {
  logger.log("🔥 Clipster is activating...");

  registerCommands();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("clipster")) registerCommands();
    }),
    new vscode.Disposable(() => disposables.forEach((d) => d.dispose()))
  );

  logger.log("✅ Clipster successfully activated!");
}

// Deactivation function
function deactivate() {
  logger.log("🛑 Clipster is deactivating...");
  disposables.forEach((d) => d.dispose());
  disposables = [];
}

module.exports = { activate, deactivate };
