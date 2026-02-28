// src/fileHelpers.ts
import fs from "fs";
import path from "path";
import os from "os";
import * as vscode from "vscode";
import type { Ignore } from "ignore";
import logger from "./logger";
import { buildIgnoreFilter, filterIgnoredFiles } from "./ignoreHelper";
import { readFileContent } from "./fileUtils";
import { showErrorMessage, showInformationMessage } from "./messageUtils";
import { traverseDirectory } from "./directoryUtils";
import { formatRootFolder } from "./structureFormatter";
import { getBaseDirectory, resolveTargetPath } from "./pathUtils";

export const isFolder = (filePath: string): boolean => {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch (err) {
    logger.error(
      `Error determining if folder: ${filePath} - ${(err as Error).message}`,
      "fileHelpers",
      __filename
    );
    return false;
  }
};

export const copyRootFolderPath = (): string => {
  if (!vscode.workspace.workspaceFolders?.length) {
    vscode.window.showErrorMessage("No workspace folder open");
    return "";
  }
  return vscode.workspace.workspaceFolders[0].uri.fsPath;
};

export const getFolderStructure = (dir: string, additionalIgnores: string[] = []): string => {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  if (!workspaceRoot) {
    logger.error("No workspace root found", "fileHelpers", __filename);
    return "No workspace open";
  }

  const absolutePath = path.resolve(dir);
  const folderName = path.basename(dir);

  // BUG-9 fix: use the *selected folder's* name in the header, not the workspace root name.
  // Previously formatRootFolder received path.basename(workspaceRoot), which produced a
  // misleading header when the selected folder differed from the workspace root.
  let structure = formatRootFolder(folderName, absolutePath);
  structure += `${folderName}/${os.EOL}`;
  structure += traverseDirectory(dir, workspaceRoot, additionalIgnores);
  return structure;
};

export const copyRootFolderStructure = (additionalIgnores: string[] = []): string => {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  if (!workspaceRoot) {
    logger.error("No workspace root found", "fileHelpers", __filename);
    return "No workspace root found.";
  }
  return getFolderStructure(workspaceRoot, additionalIgnores);
};

export const copyRootFolderStructureAndContent = (additionalIgnores: string[] = []): string => {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  if (!workspaceRoot) {
    logger.error("No workspace root found", "fileHelpers", __filename);
    return "No workspace root found.";
  }

  const config = vscode.workspace.getConfiguration("clipster");
  const maxFiles = config.get<number>("maxRootFiles", 10);
  const maxSizeKB = config.get<number>("maxRootSizeKB", 500);

  let totalSize = 0;
  let fileCount = 0;
  // BUG-5 fix: single flag shared across the entire recursive traversal so the
  // warning is shown exactly once, regardless of how many directories are visited.
  let limitReached = false;
  let content = getFolderStructure(workspaceRoot, additionalIgnores);

  // Build the ignore filter once and reuse it inside appendFileContents (BUG-2 fix).
  const filter: Ignore = buildIgnoreFilter(workspaceRoot, additionalIgnores);

  const appendFileContents = (currentDir: string): void => {
    if (limitReached || fileCount >= maxFiles || totalSize >= maxSizeKB * 1024) {
      return;
    }

    let rawEntries: fs.Dirent[];
    try {
      rawEntries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    const entries = filterIgnoredFiles(
      currentDir,
      rawEntries.map((e) => e.name),
      workspaceRoot,
      additionalIgnores,
      filter // reuse cached filter (BUG-2 fix)
    );

    for (const entry of entries) {
      if (limitReached) break;

      const entryPath = path.join(currentDir, entry);
      let stats: fs.Stats;
      try {
        stats = fs.statSync(entryPath);
      } catch (err) {
        logger.error(
          `Failed to stat: ${entryPath} - ${(err as Error).message}`,
          "fileHelpers",
          __filename
        );
        continue;
      }

      if (stats.isFile()) {
        if (totalSize + stats.size > maxSizeKB * 1024 || fileCount >= maxFiles) {
          // BUG-5 fix: guard with limitReached so the warning fires only once
          if (!limitReached) {
            vscode.window.showWarningMessage(
              `Reached limit: ${fileCount} files or ${maxSizeKB} KB total`
            );
            limitReached = true;
          }
          break;
        }
        const fileContent = readFileContent(entryPath);
        content += `${os.EOL}${os.EOL}File: ${entryPath}${os.EOL}${fileContent}`;
        totalSize += stats.size;
        fileCount++;
      } else if (stats.isDirectory()) {
        appendFileContents(entryPath);
      }

      if (fileCount >= maxFiles || totalSize >= maxSizeKB * 1024) {
        break;
      }
    }
  };

  appendFileContents(workspaceRoot);
  return content;
};

/**
 * Validates that a clipboard line is safe to use as a path component.
 *
 * VULN-2 fix: the previous implementation only inspected path.basename(),
 * which allowed traversal sequences like "../../etc/passwd" (basename = "passwd")
 * to pass validation.  We now reject any path that contains ".." segments.
 */
export const isValidPath = (filePath: string): boolean => {
  const normalised = path.normalize(filePath);
  // Reject path traversal sequences in any segment
  if (normalised.split(path.sep).some((segment) => segment === "..")) {
    return false;
  }
  const baseName = path.basename(normalised);
  const invalidChars = process.platform === "win32" ? /[<>:"/\\|?*\x00-\x1F]/g : /[/\x00]/g;
  return !invalidChars.test(baseName);
};

export const createFileOrFolderFromClipboard = async (
  clipboardContent: string,
  uri: vscode.Uri
): Promise<void> => {
  // VULN-4 fix: log only a safe preview, never the full clipboard content, to
  // prevent API keys / passwords from appearing in the Output Channel log.
  const logPreview =
    clipboardContent.length > 120
      ? `[${clipboardContent.length} chars — truncated for log safety]`
      : clipboardContent;
  logger.log(
    `Processing clipboard content: ${logPreview}`,
    "createFileOrFolderFromClipboard",
    __filename
  );

  const lines = clipboardContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (!lines.length) {
    showErrorMessage("Clipboard is empty or contains only whitespace.");
    logger.error(
      "Clipboard is empty or contains only whitespace.",
      "createFileOrFolderFromClipboard",
      __filename
    );
    return;
  }

  const baseDir = getBaseDirectory(uri);
  if (!baseDir) {
    showErrorMessage("Unable to determine the base directory.");
    logger.error(
      "Unable to determine the base directory.",
      "createFileOrFolderFromClipboard",
      __filename
    );
    return;
  }

  let filesCreated = 0;
  let foldersCreated = 0;
  let errorsOccurred = 0;

  for (const line of lines) {
    if (!isValidPath(line)) {
      showErrorMessage(`Invalid path: '${line}'`);
      logger.error(`Invalid path: ${line}`, "createFileOrFolderFromClipboard", __filename);
      errorsOccurred++;
      continue;
    }

    const targetPath = resolveTargetPath(line, baseDir);
    if (!targetPath) {
      errorsOccurred++;
      continue;
    }

    try {
      const isDirectory = line.endsWith("/") || line.endsWith("\\");
      if (isDirectory) {
        fs.mkdirSync(targetPath, { recursive: true });
        foldersCreated++;
        logger.log(`Created folder: ${targetPath}`, "createFileOrFolderFromClipboard", __filename);
      } else {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, "");
        filesCreated++;
        logger.log(`Created file: ${targetPath}`, "createFileOrFolderFromClipboard", __filename);
      }
    } catch (err) {
      showErrorMessage(`Failed to create: ${line} - ${(err as Error).message}`);
      logger.error(
        `Error creating path: ${targetPath} - ${(err as Error).message}`,
        "createFileOrFolderFromClipboard",
        __filename
      );
      errorsOccurred++;
    }
  }

  let summary = `Created ${filesCreated} file(s) and ${foldersCreated} folder(s).`;
  if (errorsOccurred > 0) {
    summary += ` ${errorsOccurred} item(s) could not be created due to errors.`;
  }
  showInformationMessage(summary);
  logger.log(summary, "createFileOrFolderFromClipboard", __filename);
};

/**
 * Copies selected files' content (with their paths as headers) to the clipboard.
 *
 * BUG-6 fix: the previous implementation had no size guard, so selecting a large
 * number of files could exhaust memory building an unbounded string.  We now
 * apply the same maxRootSizeKB limit used by copyRootFolderStructureAndContent.
 */
export const copyFileContentWithPath = async (uris: vscode.Uri[]): Promise<void> => {
  const config = vscode.workspace.getConfiguration("clipster");
  const maxSizeKB = config.get<number>("maxRootSizeKB", 500);
  const maxBytes = maxSizeKB * 1024;

  let totalSize = 0;
  const parts: string[] = [];
  let truncated = false;

  for (const uri of uris) {
    const filePath = uri.fsPath;
    let stats: fs.Stats;
    try {
      stats = fs.statSync(filePath);
    } catch {
      continue;
    }
    if (!stats.isFile()) continue;

    if (totalSize + stats.size > maxBytes) {
      truncated = true;
      break;
    }

    const fileContent = readFileContent(filePath);
    parts.push(`File: ${filePath}${os.EOL}${fileContent}`);
    totalSize += stats.size;
  }

  if (!parts.length) {
    vscode.window.showWarningMessage("No files to copy or total size exceeds limit.");
    return;
  }

  if (truncated) {
    vscode.window.showWarningMessage(
      `Size limit (${maxSizeKB} KB) reached; ${parts.length} of ${uris.length} file(s) included.`
    );
  }

  try {
    await vscode.env.clipboard.writeText(parts.join(`${os.EOL}${os.EOL}`));
    vscode.window.showInformationMessage(`${parts.length} file(s) copied with paths.`);
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to copy files: ${(err as Error).message}`);
    logger.error(`Failed to copy files: ${(err as Error).message}`, "fileHelpers", __filename);
  }
};

/**
 * Retrieves folder structure and file contents recursively.
 * workspaceRoot is threaded through all recursive calls so that the
 * ignore filter always computes paths relative to the actual workspace root.
 */
export const getFolderStructureAndContent = (
  dir: string,
  additionalIgnores: string[] = [],
  workspaceRoot?: string,
  indent = "┣ ",
  ig?: Ignore // cached ignore filter — built once and shared across recursive calls
): string => {
  if (!dir || typeof dir !== "string") {
    logger.error(
      `Invalid directory path received: ${JSON.stringify(dir)}`,
      "getFolderStructureAndContent",
      __filename
    );
    throw new Error(`Invalid directory path: ${JSON.stringify(dir)}`);
  }

  // Establish workspaceRoot on the first (top-level) call
  const root = workspaceRoot ?? vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath ?? dir;

  // Build the ignore filter once and pass it to all recursive calls (BUG-2 fix).
  const filter: Ignore = ig ?? buildIgnoreFilter(root, additionalIgnores);

  logger.log(`Scanning folder: ${dir}`, "getFolderStructureAndContent", __filename);

  let structure = `${path.basename(dir)}\n`;
  let rawEntries: fs.Dirent[];

  try {
    rawEntries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    logger.error(
      `Unable to read directory: ${dir} - ${(err as Error).message}`,
      "getFolderStructureAndContent",
      __filename
    );
    return `Failed to read directory: ${dir}`;
  }

  const entries = filterIgnoredFiles(
    dir,
    rawEntries.map((e) => e.name),
    root,
    additionalIgnores,
    filter // reuse cached filter (BUG-2 fix)
  );

  for (const entry of entries) {
    const entryPath = path.join(dir, entry);
    let stats: fs.Stats;
    try {
      stats = fs.statSync(entryPath);
    } catch (err) {
      logger.error(
        `Failed to stat: ${entryPath} - ${(err as Error).message}`,
        "getFolderStructureAndContent",
        __filename
      );
      continue;
    }

    if (stats.isDirectory()) {
      structure += getFolderStructureAndContent(
        entryPath,
        additionalIgnores,
        root,
        `${indent}┃ `,
        filter // pass cached filter to recursive call
      );
    } else {
      try {
        const fileContent = fs.readFileSync(entryPath, "utf8");
        structure += `${indent}${entry}\nContent:\n${fileContent}\n\n`;
      } catch (err) {
        logger.error(
          `Failed to read file: ${entryPath} - ${(err as Error).message}`,
          "getFolderStructureAndContent",
          __filename
        );
      }
    }
  }

  return structure;
};
