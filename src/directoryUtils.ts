// src/directoryUtils.ts
import fs from "fs";
import path from "path";
import { filterIgnoredFiles } from "./ignoreHelper";
import { formatStructure } from "./structureFormatter";
import { showErrorMessage } from "./messageUtils";

export const traverseDirectory = (
  dir: string,
  workspaceRoot: string,
  additionalIgnores: string[] = [],
  indent = ""
): string => {
  let structure = "";

  let rawEntries: fs.Dirent[];
  try {
    rawEntries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    showErrorMessage(
      `Failed to read directory: ${(err as Error).message}`
    );
    return structure;
  }

  // Filter first, then work with the filtered name list
  const filteredNames = filterIgnoredFiles(
    dir,
    rawEntries.map((e) => e.name),
    workspaceRoot,
    additionalIgnores
  );

  // Separate filtered names into directories and files using safe stat
  const dirs: string[] = [];
  const files: string[] = [];

  for (const name of filteredNames) {
    const fullPath = path.join(dir, name);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        dirs.push(name);
      } else if (stat.isFile()) {
        files.push(name);
      }
    } catch {
      // Skip inaccessible entries
    }
  }

  dirs.sort();
  files.sort();

  dirs.forEach((directory, index) => {
    const isLast = index === dirs.length - 1 && files.length === 0;
    // Use filtered children to determine whether the folder has visible children
    const childPath = path.join(dir, directory);
    let childEntries: fs.Dirent[] = [];
    try {
      childEntries = fs.readdirSync(childPath, { withFileTypes: true });
    } catch {
      // Can't read child dir; treat as empty
    }
    const visibleChildren = filterIgnoredFiles(
      childPath,
      childEntries.map((e) => e.name),
      workspaceRoot,
      additionalIgnores
    );
    const hasChildren = visibleChildren.length > 0;

    structure += formatStructure(directory, "folder", indent, isLast);
    if (hasChildren) {
      structure += traverseDirectory(
        childPath,
        workspaceRoot,
        additionalIgnores,
        `${indent}${isLast ? "  " : "┃ "}`
      );
    }
  });

  files.forEach((file, index) => {
    const isLast = index === files.length - 1;
    structure += formatStructure(file, "file", indent, isLast);
  });

  return structure;
};

export const createDirectoriesRecursively = (dirPath: string): boolean => {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  } catch (err) {
    showErrorMessage(
      `Failed to create directories: ${(err as Error).message}`
    );
    return false;
  }
};
