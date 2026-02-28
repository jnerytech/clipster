// src/fileUtils.ts
import * as vscode from "vscode";
import fs from "fs";
import path from "path";
import logger from "./logger";
import { showErrorMessage, showInformationMessage, showWarningMessage } from "./messageUtils";

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
    logger.log(`File copied to clipboard: ${filePath}`, "fileUtils", __filename);
  } catch (err) {
    showErrorMessage(`Failed to copy file: ${(err as Error).message}`);
    logger.error(`Failed to copy file: ${(err as Error).message}`, "fileUtils", __filename);
  }
};

/**
 * Recursively copies a directory tree from `src` to `dest`.
 * Symlinks are intentionally skipped to prevent following them to paths outside
 * the workspace (security hardening).
 * Used by pasteFileFromClipboard to support folder paste (BUG-7 fix).
 */
const copyDirectorySync = (src: string, dest: string): void => {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      continue; // skip symlinks to avoid following them outside the workspace
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectorySync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

export const pasteFileFromClipboard = async (targetUri: vscode.Uri): Promise<void> => {
  try {
    const clipboardContent = (await vscode.env.clipboard.readText()).trim();

    if (!clipboardContent || !fs.existsSync(clipboardContent)) {
      showErrorMessage("Clipboard does not contain a valid file path.");
      logger.error("Clipboard does not contain a valid file path.", "fileUtils", __filename);
      return;
    }

    // VULN-3 fix: the source must reside within the current workspace to prevent
    // an attacker (or malicious clipboard content) from copying arbitrary files
    // from anywhere on disk into the workspace. We use fs.realpathSync so that
    // symlink-based escapes are detected correctly on all platforms.
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
    if (workspaceRoot) {
      try {
        const srcReal = fs.realpathSync(clipboardContent);
        const rootReal = fs.realpathSync(workspaceRoot);
        const relative = path.relative(rootReal, srcReal);
        if (
          path.isAbsolute(relative) ||
          relative === ".." ||
          relative.startsWith(".." + path.sep)
        ) {
          showErrorMessage("Paste blocked: source path is outside the current workspace.");
          logger.error(
            `Paste blocked: "${clipboardContent}" is outside workspace "${workspaceRoot}"`,
            "fileUtils",
            __filename
          );
          return;
        }
      } catch (err) {
        showErrorMessage(`Paste blocked: failed to resolve source path: ${(err as Error).message}`);
        logger.error(
          `Paste blocked: could not resolve "${clipboardContent}": ${(err as Error).message}`,
          "fileUtils",
          __filename
        );
        return;
      }
    }

    const targetPath = path.join(targetUri.fsPath, path.basename(clipboardContent));

    if (fs.existsSync(targetPath)) {
      showWarningMessage(`File already exists: ${path.basename(targetPath)}`);
      logger.warn(`File already exists: ${targetPath}`, "fileUtils", __filename);
      return;
    }

    const sourceStat = fs.statSync(clipboardContent);
    if (sourceStat.isDirectory()) {
      // BUG-7 fix: the previous code used fs.copyFileSync which only works for
      // files.  Attempting to paste a folder produced an EISDIR error despite
      // the command being labelled "Copy File(s) and/or Folder(s)".
      copyDirectorySync(clipboardContent, targetPath);
      showInformationMessage(`Folder pasted: ${path.basename(targetPath)}`);
      logger.log(`Folder pasted to: ${targetPath}`, "fileUtils", __filename);
    } else {
      fs.copyFileSync(clipboardContent, targetPath);
      showInformationMessage(`File pasted: ${path.basename(targetPath)}`);
      logger.log(`File pasted to: ${targetPath}`, "fileUtils", __filename);
    }
  } catch (err) {
    showErrorMessage(`Failed to paste file: ${(err as Error).message}`);
    logger.error(`Failed to paste file: ${(err as Error).message}`, "fileUtils", __filename);
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
