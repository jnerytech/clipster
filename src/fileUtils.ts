// src/fileUtils.ts
import * as vscode from "vscode";
import fs from "fs";
import path from "path";
import logger from "./logger";
import {
  showErrorMessage,
  showInformationMessage,
  showWarningMessage,
} from "./messageUtils";

export const openFileInEditor = async (filePath: string): Promise<void> => {
  try {
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);
    logger.log(`Opened file in editor: ${filePath}`, "fileUtils", __filename);
  } catch (err) {
    showErrorMessage(`Failed to open file: ${(err as Error).message}`);
    logger.error(
      `Failed to open file: ${filePath} - ${(err as Error).message}`,
      "fileUtils",
      __filename
    );
  }
};

/**
 * Returns true when `filePath` points to an existing file (not a directory).
 * Uses a single statSync call with a try/catch — existsSync + statSync is
 * redundant because statSync already throws when the path doesn't exist.
 */
export const isFile = (filePath: string): boolean => {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
};

export const copyFileToClipboard = async (uri: vscode.Uri): Promise<void> => {
  try {
    const filePath = uri.fsPath;
    await vscode.env.clipboard.writeText(filePath);
    showInformationMessage(`File copied: ${path.basename(filePath)}`);
    logger.log(
      `File copied to clipboard: ${filePath}`,
      "fileUtils",
      __filename
    );
  } catch (err) {
    showErrorMessage(`Failed to copy file: ${(err as Error).message}`);
    logger.error(
      `Failed to copy file: ${(err as Error).message}`,
      "fileUtils",
      __filename
    );
  }
};

export const pasteFileFromClipboard = async (
  targetUri: vscode.Uri
): Promise<void> => {
  try {
    const clipboardContent = await vscode.env.clipboard.readText();

    if (!fs.existsSync(clipboardContent)) {
      showErrorMessage("Clipboard does not contain a valid file path.");
      logger.error(
        "Clipboard does not contain a valid file path.",
        "fileUtils",
        __filename
      );
      return;
    }

    const targetPath = path.join(
      targetUri.fsPath,
      path.basename(clipboardContent)
    );

    if (fs.existsSync(targetPath)) {
      showWarningMessage(`File already exists: ${path.basename(targetPath)}`);
      logger.warn(
        `File already exists: ${targetPath}`,
        "fileUtils",
        __filename
      );
      return;
    }

    fs.copyFileSync(clipboardContent, targetPath);
    showInformationMessage(`File pasted: ${path.basename(targetPath)}`);
    logger.log(`File pasted to: ${targetPath}`, "fileUtils", __filename);
  } catch (err) {
    showErrorMessage(`Failed to paste file: ${(err as Error).message}`);
    logger.error(
      `Failed to paste file: ${(err as Error).message}`,
      "fileUtils",
      __filename
    );
  }
};

export const readFileContent = (filePath: string): string => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    logger.log(`Read file content: ${filePath}`, "fileUtils", __filename);
    return content;
  } catch (err) {
    showErrorMessage(`Failed to read file: ${(err as Error).message}`);
    logger.error(
      `Failed to read file: ${filePath} - ${(err as Error).message}`,
      "fileUtils",
      __filename
    );
    return "";
  }
};
