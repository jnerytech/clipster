// src/fileContent.ts
// Pure file I/O utilities — no vscode dependency; safe to import from CLI.
import fs from "fs";
import logger from "./logger";
import { getPlatform } from "./platform";

export const isFile = (filePath: string): boolean => {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
};

export const readFileContent = (filePath: string): string => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    logger.log(`Read file content: ${filePath}`, "fileContent", __filename);
    return content;
  } catch (err) {
    getPlatform().message.error(`Failed to read file: ${(err as Error).message}`);
    logger.error(
      `Failed to read file: ${filePath} - ${(err as Error).message}`,
      "fileContent",
      __filename
    );
    return "";
  }
};
