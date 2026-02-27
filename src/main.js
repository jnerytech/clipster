// /src/main.js
// Version: 0.0.3

import path from "path";
import { copyToClipboard } from "./clipboardHelper.js";
import {
  getFolderStructure,
  getFolderStructureAndContent,
  copyRootFolderPath,
  copyRootFolderStructure,
  copyFileContentWithPath,
} from "./fileHelpers.js";

import logger from "./logger.js";
import { isFile } from "./fileUtils.js";
const moduleName = "resolveSourceFolder";

const resolveSourceFolder = (uri) => {
  if (!uri || !uri.fsPath) {
    showErrorMessage("No valid path provided.");
    logger.error(
      "No valid path provided to determine source directory.",
      moduleName,
      __filename
    );
    return null;
  }

  let folderPath = uri.fsPath;

  try {
    if (!fs.existsSync(folderPath)) {
      showErrorMessage(`Path does not exist: ${folderPath}`);
      logger.error(
        `Path does not exist: ${folderPath}`,
        moduleName,
        __filename
      );
      return null;
    }

    const stat = fs.statSync(folderPath);

    // If it's a file, use its parent folder
    if (stat.isFile()) {
      const parentFolder = path.dirname(folderPath);
      logger.log(
        `Adjusted input: Using parent folder: ${parentFolder}`,
        moduleName,
        __filename
      );
      return parentFolder;
    }

    logger.log(
      `Using selected folder: ${folderPath}`,
      moduleName,
      __filename
    );
    return folderPath;
  } catch (error) {
    showErrorMessage(
      `Unable to determine valid source folder: ${error.message}`
    );
    logger.error(
      `Unable to determine source folder: ${error.message}`,
      moduleName,
      __filename
    );
    return null;
  }
};

export const handleCopyFolderStructure = async (uri, additionalIgnores) => {
  try {
    logger.log(
      "Starting copy folder structure",
      "handleCopyFolderStructure",
      __filename
    );

    let folderPath = uri.fsPath;
    if (isFile(folderPath)) {
      folderPath = path.dirname(folderPath);
      logger.log(
        `Adjusted input: Using parent folder: ${folderPath}`,
        "handleCopyFolderStructure",
        __filename
      );
    }

    const result = await getFolderStructure(folderPath, additionalIgnores);
    await copyToClipboard(result, "Folder structure copied.");

    logger.log(
      "Folder structure copied.",
      "handleCopyFolderStructure",
      __filename
    );
  } catch (error) {
    showErrorMessage(`Failed to copy folder structure: ${error.message}`);
    logger.error(
      `Error copying folder structure: ${error.message}`,
      "handleCopyFolderStructure",
      __filename
    );
  }
};

export const handleCopyFolderStructureAndContent = async (
  uri,
  additionalIgnores
) => {
  try {
    logger.log(
      "Starting copy folder structure and content",
      moduleName + "-" + "handleCopyFolderStructureAndContent",
      __filename
    );

    const folderPath = resolveSourceFolder(uri);
    if (!folderPath) return;

    const result = await getFolderStructureAndContent(
      folderPath,
      additionalIgnores
    );

    if (result) {
      await copyToClipboard(
        result,
        "Folder structure and content copied."
      );
      logger.log(
        "Folder structure and content copied.",
        moduleName,
        __filename
      );
    } else {
      logger.error(
        "Failed to retrieve folder structure and content.",
        moduleName,
        __filename
      );
    }
  } catch (error) {
    showErrorMessage(
      `Failed to copy folder structure and content: ${error.message}`
    );
    logger.error(
      `Error copying folder structure and content: ${error.message}`,
      moduleName,
      __filename
    );
  }
};

/**
 * Handles copying file content with path.
 * @param {vscode.Uri} uri - The selected file URI.
 */
export const handleCopyFileContentWithPath = async (uri) => {
  try {
    logger.log(
      "Starting copy file content with path",
      "handleCopyFileContentWithPath",
      __filename
    );

    const result = await copyFileContentWithPath(uri);
    await copyToClipboard(
      result,
      "File content with path copied."
    );

    logger.log(
      "File content with path copied.",
      "handleCopyFileContentWithPath",
      __filename
    );
  } catch (error) {
    logger.error(
      `Error copying file content: ${error.message}`,
      "handleCopyFileContentWithPath",
      __filename
    );
  }
};

/**
 * Handles copying root folder path.
 */
export const handleCopyRootFolderPath = () => {
  try {
    logger.log(
      "Starting copy root folder path",
      "handleCopyRootFolderPath",
      __filename
    );

    const result = copyRootFolderPath();
    copyToClipboard(result, "Root folder path copied.");

    logger.log(
      "Root folder path copied.",
      "handleCopyRootFolderPath",
      __filename
    );
  } catch (error) {
    logger.error(
      `Error copying root folder path: ${error.message}`,
      "handleCopyRootFolderPath",
      __filename
    );
  }
};

/**
 * Handles copying root folder structure.
 * @param {Array<string>} additionalIgnores - Additional ignore rules.
 */
export const handleCopyRootFolderStructure = (additionalIgnores) => {
  try {
    logger.log(
      "Starting copy root folder structure",
      "handleCopyRootFolderStructure",
      __filename
    );

    const result = copyRootFolderStructure(additionalIgnores);
    copyToClipboard(result, "Root folder structure copied.");

    logger.log(
      "Root folder structure copied.",
      "handleCopyRootFolderStructure",
      __filename
    );
  } catch (error) {
    logger.error(
      `Error copying root folder structure: ${error.message}`,
      "handleCopyRootFolderStructure",
      __filename
    );
  }
};
