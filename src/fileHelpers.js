// File: /src/fileHelpers.js
// Version: 2.15.1

import fs from "fs";
import path from "path";
import os from "os";
import * as vscode from "vscode";
import logger from "./logger.js";
import { filterIgnoredFiles } from "./ignoreHelper.js";
import { readFileContent } from "./fileUtils.js";
import { showErrorMessage, showInformationMessage } from "./messageUtils.js";
import { traverseDirectory } from "./directoryUtils.js";
import { formatRootFolder } from "./structureFormatter.js";
import { getBaseDirectory, resolveTargetPath } from "./pathUtils.js";

/**
 * Determines if a given path is a folder (checks the filesystem).
 * @param {string} filePath - The path to check.
 * @returns {boolean} True if it's a directory; false otherwise.
 */
export const isFolder = (filePath) => {
  try {
    const stat = fs.statSync(filePath);
    return stat.isDirectory();
  } catch (error) {
    logger.error(
      `Error determining if folder: ${filePath} - ${error.message}`,
      "fileHelpers",
      __filename
    );
    return false;
  }
};

/**
 * Copy the root folder path. Returns the first workspace folder’s fsPath if available.
 * @returns {string} The root folder path or an empty string if none found.
 */
export const copyRootFolderPath = () => {
  if (!vscode.workspace.workspaceFolders?.length) {
    vscode.window.showErrorMessage("No workspace folder open");
    return ""; // Return empty string on error
  }
  return vscode.workspace.workspaceFolders[0].uri.fsPath; // Raw path only
};

/**
 * Retrieves the folder structure (no file contents).
 * @param {string} dir - The directory to process.
 * @param {Array<string>} additionalIgnores - Extra ignore patterns.
 * @returns {string} A formatted folder structure string.
 */
export const getFolderStructure = (dir, additionalIgnores = []) => {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  if (!workspaceRoot) {
    logger.error("No workspace root found", "fileHelpers", __filename);
    return "No workspace open";
  }

  const absolutePath = path.resolve(dir);
  const folderName = path.basename(dir);
  let structure = formatRootFolder(path.basename(workspaceRoot), absolutePath);
  structure += `${folderName}/${os.EOL}`; // Include the folder name
  structure += traverseDirectory(dir, workspaceRoot, additionalIgnores);
  return structure;
};

/**
 * Retrieves folder structure of the root folder without contents.
 * @param {Array<string>} additionalIgnores - Extra ignore patterns.
 * @returns {string} The formatted root folder structure or a fallback message.
 */
export const copyRootFolderStructure = (additionalIgnores = []) => {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  if (!workspaceRoot) {
    logger.error("No workspace root found", "fileHelpers", __filename);
    return "No workspace root found.";
  }
  return getFolderStructure(workspaceRoot, additionalIgnores);
};

/**
 * Gets the root folder structure and content, limiting files and total size to avoid huge reads.
 * @param {Array<string>} additionalIgnores - Extra ignore patterns.
 * @returns {string} The folder structure with file contents or a fallback.
 */
export const copyRootFolderStructureAndContent = (additionalIgnores = []) => {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  if (!workspaceRoot) {
    logger.error("No workspace root found", "fileHelpers", __filename);
    return "No workspace root found.";
  }

  const config = vscode.workspace.getConfiguration("clipster");
  const maxFiles = config.get("clipster.maxRootFiles", 10);
  const maxSizeKB = config.get("clipster.maxRootSizeKB", 500);

  let totalSize = 0;
  let fileCount = 0;
  let content = getFolderStructure(workspaceRoot, additionalIgnores);

  const appendFileContents = (currentDir) => {
    if (fileCount >= maxFiles || totalSize >= maxSizeKB * 1024) {
      return;
    }
    let entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries = filterIgnoredFiles(
      currentDir,
      entries.map((e) => e.name),
      workspaceRoot,
      additionalIgnores
    );

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry);
      let stats;
      try {
        stats = fs.statSync(entryPath);
      } catch (err) {
        logger.error(
          `Failed to stat: ${entryPath} - ${err.message}`,
          "fileHelpers",
          __filename
        );
        continue;
      }

      if (stats.isFile()) {
        const fileSize = stats.size;
        if (totalSize + fileSize > maxSizeKB * 1024 || fileCount >= maxFiles) {
          vscode.window.showWarningMessage(
            `Reached limit: ${fileCount} files or ${maxSizeKB}KB total`
          );
          break;
        }
        const fileContent = readFileContent(entryPath);
        content += `${os.EOL}${os.EOL}File: ${entryPath}${os.EOL}${fileContent}`;

        totalSize += fileSize;
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
 * Checks if the filename is valid on the current OS.
 * @param {string} filePath - The file path to validate.
 * @returns {boolean} True if valid; false otherwise.
 */
const isValidPath = (filePath) => {
  const baseName = path.basename(filePath);
  const invalidChars =
    process.platform === "win32" ? /[<>:"/\\|?*\x00-\x1F]/g : /[\/\x00]/g;
  return !invalidChars.test(baseName);
};

/**
 * Creates files or folders based on content from the clipboard.
 * @param {string} clipboardContent - Paths or folder/file names from the clipboard.
 * @param {vscode.Uri} uri - The folder URI where new items should be created.
 */
export const createFileOrFolderFromClipboard = async (
  clipboardContent,
  uri
) => {
  logger.log(
    `Processing clipboard content: ${clipboardContent}`,
    "createFileOrFolderFromClipboard",
    __filename
  );

  const lines = clipboardContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

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
      logger.error(
        `Invalid path: ${line}`,
        "createFileOrFolderFromClipboard",
        __filename
      );
      errorsOccurred++;
      continue;
    }

    const targetPath = resolveTargetPath(line, baseDir);

    try {
      // Heuristic: if line ends with / or \, treat it as a folder
      const isDirectory = line.endsWith("/") || line.endsWith("\\");

      if (isDirectory) {
        fs.mkdirSync(targetPath, { recursive: true });
        foldersCreated++;
        logger.log(
          `Created folder: ${targetPath}`,
          "createFileOrFolderFromClipboard",
          __filename
        );
      } else {
        // Ensure parent directories exist
        const parentDir = path.dirname(targetPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.writeFileSync(targetPath, "");
        filesCreated++;
        logger.log(
          `Created file: ${targetPath}`,
          "createFileOrFolderFromClipboard",
          __filename
        );
      }
    } catch (error) {
      showErrorMessage(`Failed to create: ${line} - ${error.message}`);
      logger.error(
        `Error creating path: ${targetPath} - ${error.message}`,
        "createFileOrFolderFromClipboard",
        __filename
      );
      errorsOccurred++;
    }
  }

  let summaryMessage = `Created ${filesCreated} file(s) and ${foldersCreated} folder(s).`;
  if (errorsOccurred > 0) {
    summaryMessage += ` ${errorsOccurred} item(s) could not be created due to errors.`;
  }
  showInformationMessage(summaryMessage);
  logger.log(summaryMessage, "createFileOrFolderFromClipboard", __filename);
};

/**
 * Copies file content (with path) to clipboard.
 * @param {vscode.Uri|vscode.Uri[]} uris - Single or multiple file URIs.
 */
export const copyFileContentWithPath = async (uris) => {
  if (!Array.isArray(uris)) {
    uris = [uris];
  }
  let copiedContent = uris
    .map((uri) => {
      const filePath = uri.fsPath;
      const fileContent = readFileContent(filePath);
      return `File: ${filePath}${os.EOL}${fileContent}`;
    })
    .join(`${os.EOL}${os.EOL}`);

  try {
    await vscode.env.clipboard.writeText(copiedContent);
    vscode.window.showInformationMessage(
      `${uris.length} file(s) copied with paths.`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to copy files: ${error.message}`);
    logger.error(
      `Failed to copy files: ${error.message}`,
      "fileHelpers",
      __filename
    );
  }
};

/**
 * Reads and copies only the file content (no path).
 * @param {vscode.Uri} uri - The file URI.
 */
export const copyFileContents = async (uri) => {
  try {
    if (!uri || !uri.fsPath) {
      vscode.window.showErrorMessage("No file selected.");
      return;
    }
    const fileContent = readFileContent(uri.fsPath);
    await vscode.env.clipboard.writeText(fileContent);
    vscode.window.showInformationMessage("File contents copied.");
  } catch (error) {
    vscode.window.showErrorMessage("Failed to copy file contents.");
    logger.error(
      `Failed to copy file contents: ${error.message}`,
      "fileHelpers",
      __filename
    );
  }
};

/**
 * Retrieves the folder structure and file contents (unlimited).
 * @param {string} dir - The directory to process.
 * @param {Array<string>} additionalIgnores - Extra ignore patterns.
 * @param {string} [indent="┣ "] - The indentation prefix for sub-items.
 * @returns {string} The combined folder structure with file contents.
 */
export const getFolderStructureAndContent = (
  dir,
  additionalIgnores = [],
  indent = "┣ "
) => {
  if (!dir || typeof dir !== "string") {
    logger.error(
      `Invalid directory path received: ${JSON.stringify(dir)}`,
      "getFolderStructureAndContent",
      __filename
    );
    throw new Error(`Invalid directory path: ${JSON.stringify(dir)}`);
  }

  logger.log(
    `Scanning folder: ${dir}`,
    "getFolderStructureAndContent",
    __filename
  );

  let structure = `${path.basename(dir)}\n`;
  let entries;

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    logger.error(
      `Unable to read directory: ${dir} - ${error.message}`,
      "getFolderStructureAndContent",
      __filename
    );
    return `Failed to read directory: ${dir}`;
  }

  entries = filterIgnoredFiles(
    dir,
    entries.map((e) => e.name),
    dir, // No workspaceRoot here? pass 'dir' or empty string
    additionalIgnores
  );

  for (const entry of entries) {
    if (typeof entry !== "string") {
      logger.error(
        `Unexpected entry type: ${JSON.stringify(entry)}`,
        "getFolderStructureAndContent",
        __filename
      );
      continue;
    }

    const entryPath = path.join(dir, entry);
    logger.log(
      `Processing: ${entryPath}`,
      "getFolderStructureAndContent",
      __filename
    );
    let stats;
    try {
      stats = fs.statSync(entryPath);
    } catch (err) {
      logger.error(
        `Failed to stat: ${entryPath} - ${err.message}`,
        "getFolderStructureAndContent",
        __filename
      );
      continue;
    }

    if (stats.isDirectory()) {
      structure += getFolderStructureAndContent(
        entryPath,
        additionalIgnores,
        `${indent}┃ `
      );
    } else {
      try {
        const content = fs.readFileSync(entryPath, "utf8");
        structure += `${indent}${entry}\nContent:\n${content}\n\n`;
      } catch (err) {
        logger.error(
          `Failed to read file: ${entryPath} - ${err.message}`,
          "getFolderStructureAndContent",
          __filename
        );
      }
    }
  }

  return structure;
};
