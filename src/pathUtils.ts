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
 *  - Absolute path  → validate it is within the workspace, then use.
 *  - Contains a directory separator (e.g. "src/foo/bar.ts") → resolve from
 *    workspace root so users can paste paths copied from other tools.
 *  - Bare name (e.g. "index.ts") → resolve from the right-clicked folder
 *    (baseDir), which is the intuitive behaviour.
 *
 * VULN-1 fix: after resolving, we verify the resulting path stays within the
 * workspace (or baseDir when no workspace is open).  Without this check a
 * crafted clipboard value like "../../etc/passwd" or an absolute path such as
 * "/etc/shadow" could create or overwrite files outside the workspace.
 */
export const resolveTargetPath = (clipboardContent: string, baseDir: string): string | null => {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  let resolved: string;

  if (path.isAbsolute(clipboardContent)) {
    resolved = path.normalize(clipboardContent);
  } else if (clipboardContent.includes("/") || clipboardContent.includes("\\")) {
    if (!workspaceRoot) {
      showErrorMessage("No workspace found. Unable to determine relative path.");
      return null;
    }
    resolved = path.normalize(path.join(workspaceRoot, clipboardContent));
  } else {
    // Bare filename: create next to the right-clicked item
    resolved = path.normalize(path.join(baseDir, clipboardContent));
  }

  // ── Confinement check ────────────────────────────────────────────────────────
  // We compare *real* filesystem paths using fs.realpathSync + path.relative so
  // that symlinks and case-insensitive filesystems (e.g. Windows) are handled
  // correctly. The target file/folder may not exist yet, so we resolve the real
  // path of its parent directory and then append the final segment.
  const allowedRoot = workspaceRoot ?? baseDir;

  try {
    const allowedRootReal = fs.realpathSync(allowedRoot);

    const resolvedDir = path.dirname(resolved);
    const resolvedDirReal = fs.realpathSync(resolvedDir);
    const resolvedReal = path.join(resolvedDirReal, path.basename(resolved));

    const relative = path.relative(allowedRootReal, resolvedReal);

    if (
      !relative ||
      path.isAbsolute(relative) ||
      relative === ".." ||
      relative.startsWith(".." + path.sep)
    ) {
      showErrorMessage(
        `Blocked: resolved path escapes the workspace. Only paths within the workspace are allowed.`
      );
      return null;
    }
  } catch (err) {
    showErrorMessage(`Failed to validate target path confinement: ${(err as Error).message}`);
    return null;
  }

  return resolved;
};
