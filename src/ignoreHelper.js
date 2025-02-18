// File: /src/ignoreHelper.js
// Version: 2.2.2

import path from "path";
import fs from "fs";
import ignore from "ignore";
import logger from "./logger.js";

/**
 * Filters ignored files using `.gitignore` and additional ignore patterns.
 * Minimal logging: logs only errors or important notices.
 *
 * @param {string} dir - The directory being scanned.
 * @param {Array<string>} files - List of filenames in the directory.
 * @param {string} workspaceRoot - The workspace root directory.
 * @param {Array<string>} additionalIgnores - Extra ignore patterns.
 * @returns {Array<string>} Filtered list of filenames.
 */
export const filterIgnoredFiles = (
  dir,
  files,
  workspaceRoot,
  additionalIgnores = []
) => {
  if (!Array.isArray(files)) {
    logger.error(
      `❌ Expected an array but received: ${typeof files}`,
      "filterIgnoredFiles",
      __filename
    );
    return [];
  }

  if (!dir || typeof dir !== "string") {
    logger.error(
      `❌ Invalid directory path: ${JSON.stringify(dir)}`,
      "filterIgnoredFiles",
      __filename
    );
    return [];
  }

  // If workspace root is missing, fallback to 'dir'
  if (!workspaceRoot || typeof workspaceRoot !== "string") {
    workspaceRoot = dir;
  }

  const ignoreFilePath = path.join(workspaceRoot, ".gitignore");
  let ignorePatterns = [...additionalIgnores];

  // Try reading .gitignore if it exists
  if (fs.existsSync(ignoreFilePath)) {
    try {
      const gitignoreContent = fs.readFileSync(ignoreFilePath, "utf-8");
      ignorePatterns = ignorePatterns.concat(
        gitignoreContent
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      );
    } catch (error) {
      logger.error(
        `⚠️ Failed to read .gitignore: ${error.message}`,
        "filterIgnoredFiles",
        __filename
      );
    }
  }

  // Initialize ignore instance
  const ig = ignore().add(ignorePatterns);

  // Flatten in case 'files' is nested, then filter
  const filteredFiles = files.flat().filter((file) => {
    try {
      if (typeof file !== "string") return false;
      const absoluteFilePath = path.resolve(dir, file);
      let relativePath = path.relative(workspaceRoot, absoluteFilePath);
      relativePath = path.posix.normalize(relativePath.replace(/\\/g, "/"));

      let isDir = false;
      try {
        isDir = fs.statSync(absoluteFilePath).isDirectory();
      } catch (statError) {
        // Quietly skip stat errors
      }
      if (isDir && !relativePath.endsWith("/")) {
        relativePath += "/";
      }

      return !ig.ignores(relativePath);
    } catch (error) {
      logger.error(
        `⚠️ Failed to process file: ${file} - ${error.message}`,
        "filterIgnoredFiles",
        __filename
      );
      return false;
    }
  });

  return filteredFiles;
};

/**
 * Placeholder function to expose the Clipster Logger.
 */
export const showClipsterLogger = () => {
  logger.log(
    "📢 Clipster Logger Display Requested",
    "showClipsterLogger",
    __filename
  );
};
