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

// Function to read file content
export const readFileContent = (filePath) => {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    showErrorMessage(`Failed to read file: ${err.message}`);
    return "";
  }
};
