// File: src/fileHelpers.js
// Version: 2.14.0

import fs from "fs";
import path from "path";
import os from "os";
import * as vscode from "vscode";
import {
  normalizeClipboardContent,
  getBaseDirectory,
  resolveTargetPath,
} from "./pathUtils.js";
import {
  traverseDirectory,
  createDirectoriesRecursively,
} from "./directoryUtils.js";
import { formatRootFolder } from "./structureFormatter.js";
import { filterIgnoredFiles } from "./ignoreHelper.js";
import { openFileInEditor, readFileContent } from "./fileUtils.js";
import {
  showErrorMessage,
  showInformationMessage,
  showWarningMessage,
} from "./messageUtils.js";

/**
 * Retrieves the folder structure (without file contents).
 * @param {string} dir - The directory to process.
 * @param {Array<string>} additionalIgnores - Extra patterns to ignore.
 * @returns {string} The formatted folder structure.
 */
export const getFolderStructure = (dir, additionalIgnores = []) => {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  const absolutePath = path.resolve(dir);
  const folderName = path.basename(dir);

  // Format the root folder with absolute path and name of the current folder
  let structure = formatRootFolder(path.basename(workspaceRoot), absolutePath);
  structure += `📂 ${folderName}${os.EOL}`; // Include folder name
  structure += traverseDirectory(dir, workspaceRoot, additionalIgnores);
  return structure;
};

/**
 * Copies the structure of the root folder without file contents.
 * @param {Array<string>} additionalIgnores - Extra patterns to ignore.
 * @returns {string} The formatted root folder structure.
 */
export const copyRootFolderStructure = (additionalIgnores = []) => {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  return workspaceRoot
    ? getFolderStructure(workspaceRoot, additionalIgnores)
    : "No workspace root found.";
};

/**
 * Gets the root folder structure and content but limits the number of files
 * and total size to prevent excessive memory usage.
 */
export const copyRootFolderStructureAndContent = (additionalIgnores = []) => {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  if (!workspaceRoot) {
    return "No workspace root found.";
  }

  const config = vscode.workspace.getConfiguration("clipster");
  const maxFiles = config.get("clipster.maxRootFiles", 10); // Default: 10 files
  const maxSizeKB = config.get("clipster.maxRootSizeKB", 500); // Default: 500KB
  let totalSize = 0;
  let fileCount = 0;
  let content = getFolderStructure(workspaceRoot, additionalIgnores);

  const appendFileContents = (currentDir) => {
    if (fileCount >= maxFiles || totalSize >= maxSizeKB * 1024) {
      return; // Stop if limits are reached
    }

    let entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries = filterIgnoredFiles(
      currentDir,
      entries.map((e) => e.name),
      workspaceRoot,
      additionalIgnores
    );

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);
      if (fs.statSync(entryPath).isFile()) {
        const fileSize = fs.statSync(entryPath).size;

        if (totalSize + fileSize > maxSizeKB * 1024 || fileCount >= maxFiles) {
          vscode.window.showWarningMessage(
            `⚠️ Reached max limit: ${fileCount} files or ${maxSizeKB}KB`
          );
          break;
        }

        const fileContent = readFileContent(entryPath);
        content += `${os.EOL}${os.EOL}📄 ${entryPath}${os.EOL}${fileContent}`;

        totalSize += fileSize;
        fileCount++;
      } else if (fs.statSync(entryPath).isDirectory()) {
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
 * Validates a file or folder path to ensure it doesn't contain invalid characters.
 * @param {string} filePath - The path to validate.
 * @returns {boolean} True if valid, false otherwise.
 */
const isValidPath = (filePath) => {
  const baseName = path.basename(filePath);
  const invalidChars =
    process.platform === "win32" ? /[<>:"/\\|?*\x00-\x1F]/g : /[\/\x00]/g;
  return !invalidChars.test(baseName);
};

/**
 * Creates files or folders based on clipboard content.
 * @param {string} clipboardContent - Content from the clipboard (paths of files or folders).
 * @param {Object} uri - The URI of the folder where the items should be created.
 */
export const createFileOrFolderFromClipboard = async (
  clipboardContent,
  uri
) => {
  // Split clipboard content into lines and filter out empty lines
  const lines = clipboardContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    showErrorMessage("Clipboard is empty or contains only whitespace.");
    return;
  }

  // Determine the base directory where the user right-clicked
  const baseDir = getBaseDirectory(uri);
  if (!baseDir) {
    showErrorMessage("Unable to determine the base directory.");
    return;
  }

  let filesCreated = 0;
  let foldersCreated = 0;
  let errorsOccurred = 0;

  // Use a Set to avoid processing duplicate paths
  const uniqueLines = new Set(lines);

  for (const line of uniqueLines) {
    // Normalize the clipboard content to handle slashes
    const clipboardLine = normalizeClipboardContent(line);

    // Validate the clipboardLine for invalid characters
    if (!isValidPath(clipboardLine)) {
      showErrorMessage(`Invalid path: '${clipboardLine}'`);
      errorsOccurred++;
      continue;
    }

    // Determine the target path
    const targetPath = resolveTargetPath(clipboardLine, baseDir);
    if (!targetPath) {
      showErrorMessage(`Unable to resolve path: '${clipboardLine}'`);
      errorsOccurred++;
      continue;
    }

    // Check if the target path exists
    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      if (stat.isFile()) {
        await openFileInEditor(targetPath);
        showInformationMessage(
          `📄 File '${targetPath}' already exists and was opened.`
        );
      } else if (stat.isDirectory()) {
        showInformationMessage(`📂 Folder '${targetPath}' already exists.`);
      }
      continue;
    }

    // Create directories recursively
    if (!createDirectoriesRecursively(path.dirname(targetPath))) {
      showErrorMessage(
        `Failed to create directory: '${path.dirname(targetPath)}'`
      );
      errorsOccurred++;
      continue;
    }

    // Determine if it's a file or folder
    if (isFolder(clipboardLine)) {
      // Create folder
      try {
        fs.mkdirSync(targetPath, { recursive: true });
        foldersCreated++;
        showInformationMessage(
          `📂 Folder '${targetPath}' created successfully!`
        );
      } catch (err) {
        showErrorMessage(`Failed to create folder: ${err.message}`);
        errorsOccurred++;
      }
    } else {
      // Create file
      try {
        fs.writeFileSync(targetPath, "");
        await openFileInEditor(targetPath);
        filesCreated++;
        showInformationMessage(`📄 File '${targetPath}' created successfully!`);
      } catch (err) {
        showErrorMessage(`Failed to create file: ${err.message}`);
        errorsOccurred++;
      }
    }
  }

  // Show a notification summarizing the results
  let summaryMessage = `✨ Created ${filesCreated} file(s) and ${foldersCreated} folder(s).`;
  if (errorsOccurred > 0) {
    summaryMessage += ` ${errorsOccurred} item(s) could not be created due to errors.`;
  }
  showInformationMessage(summaryMessage);
};

// Function to copy file content **with** path
export const copyFileContentWithPath = async (uris) => {
  if (!Array.isArray(uris)) uris = [uris]; // Ensure it's always an array

  let copiedContent = uris
    .map((uri) => {
      const filePath = uri.fsPath;
      const fileContent = readFileContent(filePath);
      return `📄 ${filePath}${os.EOL}${fileContent}`;
    })
    .join(`${os.EOL}${os.EOL}`); // Separate files for clarity

  try {
    await vscode.env.clipboard.writeText(copiedContent);
    vscode.window.showInformationMessage(
      `📝 ${uris.length} file(s) copied successfully with paths!`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to copy files: ${error.message}`);
  }
};

/**
 * Reads and copies the file content only (without the path).
 */
export const copyFileContents = async (uri) => {
  try {
    if (!uri || !uri.fsPath) {
      vscode.window.showErrorMessage("No file selected.");
      return;
    }

    const fileContent = readFileContent(uri.fsPath);
    await vscode.env.clipboard.writeText(fileContent);
    vscode.window.showInformationMessage("📄 File contents copied!");
  } catch (error) {
    vscode.window.showErrorMessage("Failed to copy file contents.");
  }
};

/**
 * Retrieves the folder structure and contents (unlimited).
 * @param {string} dir - The directory to process.
 * @param {Array<string>} additionalIgnores - Extra patterns to ignore.
 * @returns {string} Folder structure and file contents.
 */
export const getFolderStructureAndContent = (dir, additionalIgnores = []) => {
  const folderStructure = getFolderStructure(dir, additionalIgnores);
  let content = folderStructure;

  const appendFileContents = (currentDir) => {
    let entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries = filterIgnoredFiles(
      currentDir,
      entries.map((e) => e.name),
      dir,
      additionalIgnores
    );

    entries.forEach((entry) => {
      const entryPath = path.join(currentDir, entry.name);
      if (fs.statSync(entryPath).isFile()) {
        const fileContent = readFileContent(entryPath);
        content += `${os.EOL}${os.EOL}📄 ${entryPath}${os.EOL}${fileContent}`;
      } else if (fs.statSync(entryPath).isDirectory()) {
        appendFileContents(entryPath);
      }
    });
  };

  appendFileContents(dir);
  return content;
};
