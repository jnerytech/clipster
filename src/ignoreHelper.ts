// src/ignoreHelper.ts
import path from "path";
import fs from "fs";
import ignore from "ignore";
import logger from "./logger";

export const filterIgnoredFiles = (
  dir: string,
  files: string[],
  workspaceRoot: string,
  additionalIgnores: string[] = []
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

  const gitignorePath = path.join(root, ".gitignore");
  let patterns = [...additionalIgnores];

  if (fs.existsSync(gitignorePath)) {
    try {
      const content = fs.readFileSync(gitignorePath, "utf-8");
      patterns = patterns.concat(
        content
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
      );
    } catch (err) {
      logger.error(
        `Failed to read .gitignore: ${(err as Error).message}`,
        "filterIgnoredFiles",
        __filename
      );
    }
  }

  const ig = ignore().add(patterns);

  return files.flat().filter((file) => {
    try {
      if (typeof file !== "string") return false;
      const absolute = path.resolve(dir, file);
      let relative = path.relative(root, absolute);
      relative = path.posix.normalize(relative.replace(/\\/g, "/"));

      let isDir = false;
      try {
        isDir = fs.statSync(absolute).isDirectory();
      } catch {
        // skip inaccessible entries
      }
      if (isDir && !relative.endsWith("/")) {
        relative += "/";
      }

      return !ig.ignores(relative);
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
