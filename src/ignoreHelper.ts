// src/ignoreHelper.ts
import path from "path";
import fs from "fs";
import ignore, { Ignore } from "ignore";
import logger from "./logger";

/**
 * Builds a pre-initialised `ignore` instance from the workspace .gitignore
 * and any additional patterns. Call this ONCE per traversal root and reuse
 * the result across all recursive calls to avoid repeated disk I/O and
 * object construction on every directory visited (BUG-2 fix).
 */
export const buildIgnoreFilter = (
  workspaceRoot: string,
  additionalIgnores: string[] = []
): Ignore => {
  const gitignorePath = path.join(workspaceRoot, ".gitignore");
  const patterns = [...additionalIgnores];

  if (fs.existsSync(gitignorePath)) {
    try {
      const content = fs.readFileSync(gitignorePath, "utf-8");
      const lines = content
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith("#")); // strip blanks & comment lines
      patterns.push(...lines);
    } catch (err) {
      logger.error(
        `Failed to read .gitignore: ${(err as Error).message}`,
        "buildIgnoreFilter",
        __filename
      );
    }
  }

  return ignore().add(patterns);
};

export const filterIgnoredFiles = (
  dir: string,
  files: string[],
  workspaceRoot: string,
  additionalIgnores: string[] = [],
  ig?: Ignore, // optional pre-built filter — skips re-reading .gitignore on every call
  direntMap?: Map<string, boolean> // optional: maps entry name -> isDirectory, avoids extra statSync
): string[] => {
  if (!Array.isArray(files)) {
    logger.error(
      `Expected an array but received: ${typeof files}`,
      "filterIgnoredFiles",
      __filename
    );
    return [];
  }

  if (!dir || typeof dir !== "string") {
    logger.error(
      `Invalid directory path: ${JSON.stringify(dir)}`,
      "filterIgnoredFiles",
      __filename
    );
    return [];
  }

  // Fall back to the scanned dir when no workspace root is provided
  const root = workspaceRoot && typeof workspaceRoot === "string" ? workspaceRoot : dir;

  // Use the provided filter or build one on demand (backwards-compatible path)
  const filter: Ignore = ig ?? buildIgnoreFilter(root, additionalIgnores);

  return files.flat().filter((file) => {
    try {
      if (typeof file !== "string") return false;
      const absolute = path.resolve(dir, file);
      let relative = path.relative(root, absolute);
      relative = path.posix.normalize(relative.replace(/\\/g, "/"));

      let isDir = false;
      if (direntMap) {
        isDir = direntMap.get(file) ?? false;
      } else {
        try {
          isDir = fs.statSync(absolute).isDirectory();
        } catch {
          // skip inaccessible entries
        }
      }
      if (isDir && !relative.endsWith("/")) {
        relative += "/";
      }

      return !filter.ignores(relative);
    } catch (err) {
      logger.error(
        `Failed to process file: ${file} - ${(err as Error).message}`,
        "filterIgnoredFiles",
        __filename
      );
      return false;
    }
  });
};
