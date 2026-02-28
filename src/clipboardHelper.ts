// src/clipboardHelper.ts
import * as vscode from "vscode";
import logger from "./logger";

export const copyToClipboard = async (
  text: string,
  successMessage = "Copied to clipboard.",
  errorMessage = "Failed to copy to clipboard."
): Promise<void> => {
  try {
    await vscode.env.clipboard.writeText(text);
    vscode.window.showInformationMessage(successMessage);
    const preview =
      text.length > 50 ? `${text.substring(0, 50)}...` : text;
    logger.log(`Successfully copied: ${preview}`, "clipboardHelper", __filename);
  } catch (error) {
    vscode.window.showErrorMessage(errorMessage);
    logger.error(
      `Clipboard copy failed: ${(error as Error).message}`,
      "clipboardHelper",
      __filename
    );
  }
};
