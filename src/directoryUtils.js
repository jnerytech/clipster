// File: directoryUtils.js 0.0.1

import fs from "fs";
import path from "path";
import os from "os";
import { filterIgnoredFiles } from "./ignoreHelper.js";
import { formatStructure } from "./structureFormatter.js";
import { showErrorMessage } from "./messageUtils.js";

// Function to traverse a directory, formatting its structure for display
export const traverseDirectory = (
  dir,
  workspaceRoot,
  additionalIgnores = [],
  indent = "",
  isLast = false
) => {
  let structure = "";

  // Get directory entries and filter based on ignore patterns
  let entries = fs.readdirSync(dir, { withFileTypes: true });
  entries = filterIgnoredFiles(
    dir,
    entries.map((e) => e.name),
    workspaceRoot,
    additionalIgnores
  );

  // Separate and sort directories and files
  const directories = entries
    .filter((entry) => fs.statSync(path.join(dir, entry)).isDirectory())
    .sort();
  const files = entries
    .filter((entry) => fs.statSync(path.join(dir, entry)).isFile())
    .sort();

  // Traverse directories first
  directories.forEach((directory, index) => {
    const isLastDir = index === directories.length - 1 && files.length === 0;
    const hasChildren = fs.readdirSync(path.join(dir, directory)).length > 0;
    structure += formatStructure(
      directory,
      "folder",
      indent,
      isLastDir,
      hasChildren
    );
    structure += traverseDirectory(
      path.join(dir, directory),
      workspaceRoot,
      additionalIgnores,
      `${indent}${isLastDir ? "  " : "┃ "}`,
      isLastDir
    );
  });

  // Traverse files
  files.forEach((file, index) => {
    const isLastFile = index === files.length - 1;
    structure += formatStructure(file, "file", indent, isLastFile, false);
  });

  return structure;
};

// Create directories recursively
export const createDirectoriesRecursively = (dirPath) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  } catch (err) {
    showErrorMessage(`Failed to create directories: ${err.message}`);
    return false;
  }
};
