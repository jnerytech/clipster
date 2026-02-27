// src\structureFormatter.js 0.0.1
import os from "os";

// Helper to format folder and file structure with appropriate lines
export const formatStructure = (name, type, indent, isLast, hasChildren) => {
  // Handle line prefixes for consistency within the same folder level
  const linePrefix = isLast ? "┗ " : "┣ ";
  const childIndent = isLast ? "  " : "┃ ";

  // Return formatted string ensuring proper alignment without extra spaces
  return `${indent}${linePrefix}${name}${os.EOL}${
    hasChildren ? "" : ""
  }`;
};

// Function to format the root folder structure header with absolute path
export const formatRootFolder = (name, path) => {
  return `${name}${os.EOL}Path: ${path}${os.EOL}`;
};
