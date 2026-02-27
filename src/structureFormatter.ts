// src/structureFormatter.ts
import os from "os";

export const formatStructure = (
  name: string,
  _type: "file" | "folder",
  indent: string,
  isLast: boolean
): string => {
  const linePrefix = isLast ? "┗ " : "┣ ";
  return `${indent}${linePrefix}${name}${os.EOL}`;
};

export const formatRootFolder = (name: string, folderPath: string): string => {
  return `${name}${os.EOL}Path: ${folderPath}${os.EOL}`;
};
