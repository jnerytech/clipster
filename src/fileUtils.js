// File: fileUtils.js

import * as vscode from "vscode";
import fs from "fs";
import { showErrorMessage } from "./messageUtils.js";

// Function to open a file in the editor
export const openFileInEditor = async (filePath) => {
  try {
    const document = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(document);
  } catch (err) {
    showErrorMessage(`Failed to open file: ${err.message}`);
  }
};

/**
 * Checks if a given path is a file.
 * @param {string} filePath - The path to check.
 * @returns {boolean} True if the path points to a file.
 */
export const isFile = (filePath) => {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
};

// Function to copy a file (store its path in clipboard)
export const copyFileToClipboard = async (uri) => {
  try {
    const filePath = uri.fsPath;
    await vscode.env.clipboard.writeText(filePath);
    vscode.window.showInformationMessage(
      `📄 File copied: ${path.basename(filePath)}`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to copy file: ${error.message}`);
  }
};

// Function to paste a copied file into a folder
export const pasteFileFromClipboard = async (targetUri) => {
  try {
    const clipboardContent = await vscode.env.clipboard.readText();
    if (!fs.existsSync(clipboardContent)) {
      vscode.window.showErrorMessage(
        "Clipboard does not contain a valid file path."
      );
      return;
    }

    const targetPath = path.join(
      targetUri.fsPath,
      path.basename(clipboardContent)
    );

    // Check if file already exists in target
    if (fs.existsSync(targetPath)) {
      vscode.window.showWarningMessage(
        `File already exists: ${path.basename(targetPath)}`
      );
      return;
    }

    fs.copyFileSync(clipboardContent, targetPath);
    vscode.window.showInformationMessage(
      `📄 File pasted: ${path.basename(targetPath)}`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to paste file: ${error.message}`);
  }
};

// Function to read file content safely
export const readFileContent = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      showErrorMessage(`⚠️ File not found: ${filePath}`);
      return "";
    }

    const content = fs.readFileSync(filePath, "utf-8");
    return content;
  } catch (err) {
    showErrorMessage(`❌ Failed to read file: ${err.message}`);
    return "";
  }
};
