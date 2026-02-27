// src/pathUtils.ts
import path from "path";
import fs from "fs";
import * as vscode from "vscode";
import { showErrorMessage } from "./messageUtils";

export const normalizeClipboardContent = (content: string): string => {
  return content.replace(/[/\\]+/g, path.sep);
};

/**
 * Returns the directory to use as the creation root, based on what was
 * right-clicked in the Explorer.  If a file was clicked, returns its parent
 * folder; if a folder was clicked, returns that folder.
 */
export const getBaseDirectory = (uri: vscode.Uri): string | null => {
  try {
    const stat = fs.statSync(uri.fsPath);
    return stat.isFile() ? path.dirname(uri.fsPath) : uri.fsPath;
  } catch (err) {
    showErrorMessage(
      `Failed to determine the type of the selected item: ${(err as Error).message}`
    );
    return null;
  }
};

/**
 * Resolves where to create a new file or folder from clipboard text.
 *
 * Rules:
 *  - Absolute path  → use as-is.
 *  - Contains a directory separator (e.g. "src/foo/bar.ts") → resolve from
 *    workspace root so users can paste paths copied from other tools.
 *  - Bare name (e.g. "index.ts") → resolve from the right-clicked folder
 *    (baseDir), which is the intuitive behaviour.
 */
export const resolveTargetPath = (
  clipboardContent: string,
  baseDir: string
): string | null => {
  if (path.isAbsolute(clipboardContent)) {
    return path.normalize(clipboardContent);
  }

  const containsSeparator =
    clipboardContent.includes("/") || clipboardContent.includes("\\");

  if (containsSeparator) {
    const workspaceRoot =
      vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
    if (!workspaceRoot) {
      showErrorMessage(
        "No workspace found. Unable to determine relative path."
      );
      return null;
    }
    return path.normalize(path.join(workspaceRoot, clipboardContent));
  }

  // Bare filename: create next to the right-clicked item
  return path.normalize(path.join(baseDir, clipboardContent));
};
