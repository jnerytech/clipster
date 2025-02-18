// File: /src/fileUtils.js
// Version: 2.2.0

import * as vscode from "vscode";
import fs from "fs";
import path from "path";
import logger from "./logger.js";
import {
  showErrorMessage,
  showInformationMessage,
  showWarningMessage,
} from "./messageUtils.js";

/**
 * Opens a file in the VS Code editor.
 * @param {string} filePath - The absolute path of the file to open.
 */
export const openFileInEditor = async (filePath) => {
  try {
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);
    logger.log(
      `📄 Opened file in editor: ${filePath}`,
      "fileUtils",
      __filename
    );
  } catch (err) {
    showErrorMessage(`Failed to open file: ${err.message}`);
    logger.error(
      `❌ Failed to open file: ${filePath} - ${err.message}`,
      "fileUtils",
      __filename
    );
  }
};

/**
 * Checks if a given path is a file.
 * @param {string} filePath - The path to check.
 * @returns {boolean} True if the path points to a file.
 */
export const isFile = (filePath) => {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch (error) {
    logger.error(
      `❌ Error checking if path is file: ${filePath} - ${error.message}`,
      "fileUtils",
      __filename
    );
    return false;
  }
};

/**
 * Determines the correct source directory when right-clicking a file or folder.
 * If a file is selected, it returns its parent directory.
 * If a folder is selected, it returns the folder itself.
 * @param {vscode.Uri} uri - The selected file or folder URI.
 * @returns {string} The resolved folder path.
 */
export const getSourceDirectory = (uri) => {
  const selectedPath = uri?.fsPath;

  if (!selectedPath) {
    showErrorMessage("No valid path provided.");
    logger.error(
      "❌ No valid path provided to determine source directory.",
      "fileUtils",
      __filename
    );
    return null;
  }

  if (isFile(selectedPath)) {
    const parentDir = path.dirname(selectedPath);
    logger.log(
      `📂 Using parent directory of selected file: ${parentDir}`,
      "fileUtils",
      __filename
    );
    return parentDir;
  }

  logger.log(
    `📂 Using selected folder: ${selectedPath}`,
    "fileUtils",
    __filename
  );
  return selectedPath;
};

/**
 * Copies a file path to the clipboard.
 * @param {vscode.Uri} uri - The file URI.
 */
export const copyFileToClipboard = async (uri) => {
  try {
    const filePath = uri.fsPath;
    await vscode.env.clipboard.writeText(filePath);
    showInformationMessage(`📄 File copied: ${path.basename(filePath)}`);
    logger.log(
      `📄 File copied to clipboard: ${filePath}`,
      "fileUtils",
      __filename
    );
  } catch (error) {
    showErrorMessage(`Failed to copy file: ${error.message}`);
    logger.error(
      `❌ Failed to copy file: ${error.message}`,
      "fileUtils",
      __filename
    );
  }
};

/**
 * Pastes a copied file into a target folder.
 * @param {vscode.Uri} targetUri - The target directory URI.
 */
export const pasteFileFromClipboard = async (targetUri) => {
  try {
    const clipboardContent = await vscode.env.clipboard.readText();

    if (!fs.existsSync(clipboardContent)) {
      showErrorMessage("Clipboard does not contain a valid file path.");
      logger.error(
        "❌ Clipboard does not contain a valid file path.",
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
        `⚠️ File already exists: ${targetPath}`,
        "fileUtils",
        __filename
      );
      return;
    }

    fs.copyFileSync(clipboardContent, targetPath);
    showInformationMessage(`📄 File pasted: ${path.basename(targetPath)}`);
    logger.log(`📄 File pasted to: ${targetPath}`, "fileUtils", __filename);
  } catch (error) {
    showErrorMessage(`Failed to paste file: ${error.message}`);
    logger.error(
      `❌ Failed to paste file: ${error.message}`,
      "fileUtils",
      __filename
    );
  }
};

/**
 * Reads file content safely.
 * @param {string} filePath - The file path.
 * @returns {string} The file content or an empty string if an error occurs.
 */
export const readFileContent = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      showErrorMessage(`⚠️ File not found: ${filePath}`);
      logger.warn(`⚠️ File not found: ${filePath}`, "fileUtils", __filename);
      return "";
    }

    const content = fs.readFileSync(filePath, "utf-8");
    logger.log(`📄 Read file content: ${filePath}`, "fileUtils", __filename);
    return content;
  } catch (err) {
    showErrorMessage(`❌ Failed to read file: ${err.message}`);
    logger.error(
      `❌ Failed to read file: ${filePath} - ${err.message}`,
      "fileUtils",
      __filename
    );
    return "";
  }
};
