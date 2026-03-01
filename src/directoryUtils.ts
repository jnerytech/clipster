// src/directoryUtils.ts
import fs from "fs";
import path from "path";
import type { Ignore } from "ignore";
import { buildIgnoreFilter, filterIgnoredFiles } from "./ignoreHelper";
import { formatStructure } from "./structureFormatter";
import { getPlatform } from "./platform";

export const traverseDirectory = (
  dir: string,
  workspaceRoot: string,
  additionalIgnores: string[] = [],
  indent = "",
  ig?: Ignore // cached ignore filter — built once at the top-level call and shared
): string => {
  let structure = "";

  // Build the filter exactly once per traversal root; all recursive calls reuse it.
  // This eliminates the O(n-directories) .gitignore re-reads (BUG-2 fix).
  const filter: Ignore = ig ?? buildIgnoreFilter(workspaceRoot, additionalIgnores);

  let rawEntries: fs.Dirent[];
  try {
    rawEntries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    getPlatform().message.error(`Failed to read directory: ${(err as Error).message}`);
    return structure;
  }

  // Filter first, then work with the filtered name list
  const direntMap = new Map(rawEntries.map((e) => [e.name, e.isDirectory()]));
  const filteredNames = filterIgnoredFiles(
    dir,
    rawEntries.map((e) => e.name),
    workspaceRoot,
    additionalIgnores,
    filter, // pass the cached filter — avoids another .gitignore read inside
    direntMap // pass dirent type info — avoids a statSync per entry in filterIgnoredFiles
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
    const childPath = path.join(dir, directory);

    structure += formatStructure(directory, "folder", indent, isLast);

    // Recurse directly without a lookahead readdir (BUG-3 fix).
    // An empty or fully-filtered directory simply returns "" — no connector glyph
    // is added for it and the visual result is identical to the old behaviour.
    structure += traverseDirectory(
      childPath,
      workspaceRoot,
      additionalIgnores,
      `${indent}${isLast ? "  " : "┃ "}`,
      filter // share the already-built filter across all recursive calls
    );
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
    getPlatform().message.error(`Failed to create directories: ${(err as Error).message}`);
    return false;
  }
};
