// /src/clipboardHelper.js
// Version: 1.0.1

import * as vscode from "vscode";
import logger from "./logger.js"; // ✅ Ensure logger is imported

export const copyToClipboard = async (
  text,
  successMessage = "📁 Copied to clipboard!",
  errorMessage = "Failed to copy to clipboard."
) => {
  try {
    logger.log(
      "📋 Attempting to copy to clipboard...",
      "clipboardHelper",
      __filename
    );
    await vscode.env.clipboard.writeText(text);
    vscode.window.showInformationMessage(successMessage);
    logger.log(
      `✅ Successfully copied: ${text.substring(0, 50)}...`,
      "clipboardHelper",
      __filename
    );
  } catch (error) {
    vscode.window.showErrorMessage(errorMessage);
    logger.error(
      `❌ Clipboard copy failed: ${error.message}`,
      "clipboardHelper",
      __filename
    );
  }
};
