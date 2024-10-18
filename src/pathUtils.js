// File: pathUtils.js

import path from "path";
import * as vscode from "vscode";
import fs from "fs";
import { showErrorMessage } from "./messageUtils.js";

// Normalize clipboard content to handle slashes
export const normalizeClipboardContent = (clipboardContent) => {
  return clipboardContent.replace(/[\\\/]+/g, path.sep);
};

// Get the base directory where the user right-clicked
export const getBaseDirectory = (uri) => {
  try {
    const stat = fs.statSync(uri.fsPath);

    if (stat.isFile()) {
      // If right-clicked on a file, use its parent directory
      return path.dirname(uri.fsPath);
    } else if (stat.isDirectory()) {
      // If right-clicked on a folder, use that folder directly
      return uri.fsPath;
    }
  } catch (err) {
    showErrorMessage(`Failed to determine the type of the selected item: ${err.message}`);
    return null;
  }
};

// Resolve the target path based on clipboard content and base directory
export const resolveTargetPath = (clipboardContent, baseDir) => {
  let targetPath;

  if (isFullPath(clipboardContent)) {
    targetPath = path.normalize(clipboardContent);
  } else if (isRelativePath(clipboardContent)) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
    if (workspaceRoot) {
      targetPath = path.normalize(path.join(workspaceRoot, clipboardContent));
    } else {
      showErrorMessage("No workspace found. Unable to determine relative path.");
      return null;
    }
  } else {
    targetPath = path.normalize(path.join(baseDir, clipboardContent));
  }

  return targetPath;
};

// Function to check if a given path is an absolute path
export const isFullPath = (clipboardContent) => {
  return path.isAbsolute(clipboardContent);
};

// Function to check if a given path is a relative path
export const isRelativePath = (clipboardContent) => {
  return !path.isAbsolute(clipboardContent);
};
