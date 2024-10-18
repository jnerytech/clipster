// File: src/fileHelpers.js
// Version: 2.10.0

import * as vscode from "vscode";
import path from "path";
import os from "os";
import fs from "fs";
import {
  // Removed imports of isFolder, isFile, isFullPath, isRelativePath
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
import { showErrorMessage, showInformationMessage } from "./messageUtils.js";

// Function to get the folder structure
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

// Function to get folder structure and content
export const getFolderStructureAndContent = (dir, additionalIgnores = []) => {
  const folderStructure = getFolderStructure(dir, additionalIgnores);
  let content = folderStructure;

  // Append file contents below the folder structure
  const appendFileContents = (currentDir) => {
    let entries = fs.readdirSync(currentDir, { withFileTypes: true });
    entries = filterIgnoredFiles(
      currentDir,
      entries.map((e) => e.name),
      dir,
      additionalIgnores
    );

    entries.forEach((entry) => {
      const entryPath = path.join(currentDir, entry);
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

// Function to copy file content with path
export const copyFileContentWithPath = (uri) => {
  const filePath = uri.fsPath;
  const fileContent = readFileContent(filePath);
  return `${filePath}${os.EOL}${fileContent}`;
};

// Function to copy root folder path
export const copyRootFolderPath = () => {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  return workspaceRoot
    ? `📁 Root Path: ${workspaceRoot}`
    : "No workspace root found.";
};

// Function to copy root folder structure
export const copyRootFolderStructure = (additionalIgnores = []) => {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  return workspaceRoot
    ? getFolderStructure(workspaceRoot, additionalIgnores)
    : "No workspace root found.";
};

// Function to create files or folders from clipboard content
export const createFileOrFolderFromClipboard = async (
  clipboardContent,
  uri
) => {
  // Split clipboard content into lines
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
    return; // Error message is handled inside getBaseDirectory
  }

  let filesCreated = 0;
  let foldersCreated = 0;

  for (const line of lines) {
    // Normalize the clipboard content to handle slashes
    const clipboardLine = normalizeClipboardContent(line);

    // Determine the target path
    const targetPath = resolveTargetPath(clipboardLine, baseDir);
    if (!targetPath) {
      continue; // Error message is handled inside resolveTargetPath
    }

    // Check if the target path exists
    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      if (stat.isFile()) {
        // Open the file
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
      continue; // Error message is handled inside createDirectoriesRecursively
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
      }
    }
  }

  // Show a notification summarizing the results
  if (filesCreated > 0 || foldersCreated > 0) {
    showInformationMessage(
      `✨ Created ${filesCreated} file(s) and ${foldersCreated} folder(s).`
    );
  } else {
    showInformationMessage("No files or folders were created.");
  }
};

// Public helper functions (must remain unchanged)

// Function to check if clipboard content represents a folder
export const isFolder = (clipboardContent) => {
  const lastSegment = clipboardContent.split(/[\\\/]/).pop();
  return !path.extname(lastSegment) && !lastSegment.startsWith(".");
};

// Function to check if a path is a file
export const isFile = (filePath) => {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
};

// Function to check if a given path is an absolute path
export const isFullPath = (clipboardContent) => {
  return path.isAbsolute(clipboardContent);
};

// Function to check if a given path is a relative path
export const isRelativePath = (clipboardContent) => {
  return !path.isAbsolute(clipboardContent);
};
