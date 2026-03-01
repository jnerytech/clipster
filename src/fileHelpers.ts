// src/fileHelpers.ts
import fs from "fs";
import path from "path";
import os from "os";
import type { Ignore } from "ignore";
import logger from "./logger";
import { buildIgnoreFilter, filterIgnoredFiles } from "./ignoreHelper";
import { readFileContent } from "./fileContent";
import { traverseDirectory } from "./directoryUtils";
import { formatRootFolder } from "./structureFormatter";
import { getBaseDirectory, resolveTargetPath } from "./pathUtils";
import { getPlatform, DiagnosticItem, DiagnosticSeverity } from "./platform";

export const isFolder = (filePath: string): boolean => {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch (err) {
    logger.error(
      `Error determining if folder: ${filePath} - ${(err as Error).message}`,
      "fileHelpers",
      __filename
    );
    return false;
  }
};

export const copyRootFolderPath = (): string => {
  const root = getPlatform().getWorkspaceRoot();
  if (!root) {
    getPlatform().message.error("No workspace folder open");
    return "";
  }
  return root;
};

export const getFolderStructure = (dir: string, additionalIgnores: string[] = []): string => {
  const workspaceRoot = getPlatform().getWorkspaceRoot();
  if (!workspaceRoot) {
    logger.error("No workspace root found", "fileHelpers", __filename);
    return "No workspace open";
  }

  const absolutePath = path.resolve(dir);
  const folderName = path.basename(dir);

  // BUG-9 fix: use the *selected folder's* name in the header, not the workspace root name.
  let structure = formatRootFolder(folderName, absolutePath);
  structure += `${folderName}/${os.EOL}`;
  structure += traverseDirectory(dir, workspaceRoot, additionalIgnores);
  return structure;
};

export const copyRootFolderStructure = (additionalIgnores: string[] = []): string => {
  const workspaceRoot = getPlatform().getWorkspaceRoot();
  if (!workspaceRoot) {
    logger.error("No workspace root found", "fileHelpers", __filename);
    return "No workspace root found.";
  }
  return getFolderStructure(workspaceRoot, additionalIgnores);
};

export const copyRootFolderStructureAndContent = (additionalIgnores: string[] = []): string => {
  const workspaceRoot = getPlatform().getWorkspaceRoot();
  if (!workspaceRoot) {
    logger.error("No workspace root found", "fileHelpers", __filename);
    return "No workspace root found.";
  }

  const maxFiles = getPlatform().getConfig<number>("maxRootFiles", 10);
  const maxSizeKB = getPlatform().getConfig<number>("maxRootSizeKB", 500);

  let totalSize = 0;
  let fileCount = 0;
  // BUG-5 fix: single flag shared across the entire recursive traversal so the
  // warning is shown exactly once, regardless of how many directories are visited.
  let limitReached = false;
  let content = getFolderStructure(workspaceRoot, additionalIgnores);

  // Build the ignore filter once and reuse it inside appendFileContents (BUG-2 fix).
  const filter: Ignore = buildIgnoreFilter(workspaceRoot, additionalIgnores);

  const appendFileContents = (currentDir: string): void => {
    if (limitReached || fileCount >= maxFiles || totalSize >= maxSizeKB * 1024) {
      return;
    }

    let rawEntries: fs.Dirent[];
    try {
      rawEntries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    const entries = filterIgnoredFiles(
      currentDir,
      rawEntries.map((e) => e.name),
      workspaceRoot,
      additionalIgnores,
      filter // reuse cached filter (BUG-2 fix)
    );

    for (const entry of entries) {
      if (limitReached) break;

      const entryPath = path.join(currentDir, entry);
      let stats: fs.Stats;
      try {
        stats = fs.statSync(entryPath);
      } catch (err) {
        logger.error(
          `Failed to stat: ${entryPath} - ${(err as Error).message}`,
          "fileHelpers",
          __filename
        );
        continue;
      }

      if (stats.isFile()) {
        if (totalSize + stats.size > maxSizeKB * 1024 || fileCount >= maxFiles) {
          // BUG-5 fix: guard with limitReached so the warning fires only once
          if (!limitReached) {
            getPlatform().message.warn(
              `Reached limit: ${fileCount} files or ${maxSizeKB} KB total`
            );
            limitReached = true;
          }
          break;
        }
        const fileContent = readFileContent(entryPath);
        content += `${os.EOL}${os.EOL}File: ${entryPath}${os.EOL}${fileContent}`;
        totalSize += stats.size;
        fileCount++;
      } else if (stats.isDirectory()) {
        appendFileContents(entryPath);
      }

      if (fileCount >= maxFiles || totalSize >= maxSizeKB * 1024) {
        break;
      }
    }
  };

  appendFileContents(workspaceRoot);
  return content;
};

/**
 * Validates that a clipboard line is safe to use as a path component.
 *
 * VULN-2 fix: the previous implementation only inspected path.basename(),
 * which allowed traversal sequences like "../../etc/passwd" (basename = "passwd")
 * to pass validation.  We now reject any path that contains ".." segments.
 */
export const isValidPath = (filePath: string): boolean => {
  const normalised = path.normalize(filePath);
  // Reject path traversal sequences in any segment
  if (normalised.split(path.sep).some((segment) => segment === "..")) {
    return false;
  }
  const baseName = path.basename(normalised);
  const invalidChars = process.platform === "win32" ? /[<>:"/\\|?*\x00-\x1F]/g : /[/\x00]/g;
  return !invalidChars.test(baseName);
};

export const createFileOrFolderFromClipboard = async (
  clipboardContent: string,
  dirPath: string
): Promise<void> => {
  // VULN-4 fix: log only a safe preview, never the full clipboard content, to
  // prevent API keys / passwords from appearing in the Output Channel log.
  const logPreview =
    clipboardContent.length > 120
      ? `[${clipboardContent.length} chars — truncated for log safety]`
      : clipboardContent;
  logger.log(
    `Processing clipboard content: ${logPreview}`,
    "createFileOrFolderFromClipboard",
    __filename
  );

  const lines = clipboardContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (!lines.length) {
    getPlatform().message.error("Clipboard is empty or contains only whitespace.");
    logger.error(
      "Clipboard is empty or contains only whitespace.",
      "createFileOrFolderFromClipboard",
      __filename
    );
    return;
  }

  const baseDir = getBaseDirectory(dirPath);
  if (!baseDir) {
    getPlatform().message.error("Unable to determine the base directory.");
    logger.error(
      "Unable to determine the base directory.",
      "createFileOrFolderFromClipboard",
      __filename
    );
    return;
  }

  let filesCreated = 0;
  let foldersCreated = 0;
  let errorsOccurred = 0;

  for (const line of lines) {
    if (!isValidPath(line)) {
      getPlatform().message.error(`Invalid path: '${line}'`);
      logger.error(`Invalid path: ${line}`, "createFileOrFolderFromClipboard", __filename);
      errorsOccurred++;
      continue;
    }

    const targetPath = resolveTargetPath(line, baseDir);
    if (!targetPath) {
      errorsOccurred++;
      continue;
    }

    try {
      const isDirectory = line.endsWith("/") || line.endsWith("\\");
      if (isDirectory) {
        fs.mkdirSync(targetPath, { recursive: true });
        foldersCreated++;
        logger.log(`Created folder: ${targetPath}`, "createFileOrFolderFromClipboard", __filename);
      } else {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, "");
        filesCreated++;
        logger.log(`Created file: ${targetPath}`, "createFileOrFolderFromClipboard", __filename);
      }
    } catch (err) {
      getPlatform().message.error(`Failed to create: ${line} - ${(err as Error).message}`);
      logger.error(
        `Error creating path: ${targetPath} - ${(err as Error).message}`,
        "createFileOrFolderFromClipboard",
        __filename
      );
      errorsOccurred++;
    }
  }

  let summary = `Created ${filesCreated} file(s) and ${foldersCreated} folder(s).`;
  if (errorsOccurred > 0) {
    summary += ` ${errorsOccurred} item(s) could not be created due to errors.`;
  }
  getPlatform().message.info(summary);
  logger.log(summary, "createFileOrFolderFromClipboard", __filename);
};

/**
 * Copies selected files' content (with their paths as headers) to the clipboard.
 *
 * BUG-6 fix: the previous implementation had no size guard, so selecting a large
 * number of files could exhaust memory building an unbounded string.  We now
 * apply the same maxRootSizeKB limit used by copyRootFolderStructureAndContent.
 */
export const copyFileContentWithPath = async (filePaths: string[]): Promise<void> => {
  const maxSizeKB = getPlatform().getConfig<number>("maxRootSizeKB", 500);
  const maxBytes = maxSizeKB * 1024;

  let totalSize = 0;
  const parts: string[] = [];
  let truncated = false;

  for (const filePath of filePaths) {
    let stats: fs.Stats;
    try {
      stats = fs.statSync(filePath);
    } catch {
      continue;
    }
    if (!stats.isFile()) continue;

    if (totalSize + stats.size > maxBytes) {
      truncated = true;
      break;
    }

    const fileContent = readFileContent(filePath);
    parts.push(`File: ${filePath}${os.EOL}${fileContent}`);
    totalSize += stats.size;
  }

  if (!parts.length) {
    getPlatform().message.warn("No files to copy or total size exceeds limit.");
    return;
  }

  if (truncated) {
    getPlatform().message.warn(
      `Size limit (${maxSizeKB} KB) reached; ${parts.length} of ${filePaths.length} file(s) included.`
    );
  }

  try {
    await getPlatform().clipboard.writeText(parts.join(`${os.EOL}${os.EOL}`));
    getPlatform().message.info(`${parts.length} file(s) copied with paths.`);
  } catch (err) {
    getPlatform().message.error(`Failed to copy files: ${(err as Error).message}`);
    logger.error(`Failed to copy files: ${(err as Error).message}`, "fileHelpers", __filename);
  }
};

/**
 * Copies selected files' content with line numbers prefixed to each line.
 */
export const copyFileContentWithLineNumbers = async (filePaths: string[]): Promise<void> => {
  const maxSizeKB = getPlatform().getConfig<number>("maxRootSizeKB", 500);
  const maxBytes = maxSizeKB * 1024;

  let totalSize = 0;
  const parts: string[] = [];
  let truncated = false;

  for (const filePath of filePaths) {
    let stats: fs.Stats;
    try {
      stats = fs.statSync(filePath);
    } catch {
      continue;
    }
    if (!stats.isFile()) continue;

    if (totalSize + stats.size > maxBytes) {
      truncated = true;
      break;
    }

    const fileContent = readFileContent(filePath);
    const lines = fileContent.split("\n");
    const width = String(lines.length).length;
    const numbered = lines
      .map((line, i) => `${String(i + 1).padStart(width)} | ${line}`)
      .join("\n");
    parts.push(`File: ${filePath}${os.EOL}${numbered}`);
    totalSize += stats.size;
  }

  if (!parts.length) {
    getPlatform().message.warn("No files to copy or total size exceeds limit.");
    return;
  }

  if (truncated) {
    getPlatform().message.warn(
      `Size limit (${maxSizeKB} KB) reached; ${parts.length} of ${filePaths.length} file(s) included.`
    );
  }

  try {
    await getPlatform().clipboard.writeText(parts.join(`${os.EOL}${os.EOL}`));
    getPlatform().message.info(`${parts.length} file(s) copied with line numbers.`);
  } catch (err) {
    getPlatform().message.error(`Failed to copy files: ${(err as Error).message}`);
    logger.error(`Failed to copy files: ${(err as Error).message}`, "fileHelpers", __filename);
  }
};

/**
 * Recursively collects all files under a folder, renders each with line numbers,
 * and writes the combined result to the clipboard.
 */
export const copyFolderFilesWithLineNumbers = async (
  dirPath: string,
  additionalIgnores: string[] = []
): Promise<void> => {
  const maxSizeKB = getPlatform().getConfig<number>("maxRootSizeKB", 500);
  const maxBytes = maxSizeKB * 1024;
  const workspaceRoot = getPlatform().getWorkspaceRoot() ?? dirPath;

  const parts: string[] = [];
  let totalSize = 0;
  let truncated = false;

  const collect = (currentDir: string, filter: Ignore): void => {
    if (truncated) return;
    let rawEntries: fs.Dirent[];
    try {
      rawEntries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      logger.error(
        `Unable to read directory: ${currentDir} - ${(err as Error).message}`,
        "copyFolderFilesWithLineNumbers",
        __filename
      );
      return;
    }

    const entries = filterIgnoredFiles(
      currentDir,
      rawEntries.map((e) => e.name),
      workspaceRoot,
      additionalIgnores,
      filter
    );

    for (const entry of entries) {
      if (truncated) return;
      const entryPath = path.join(currentDir, entry);
      let stats: fs.Stats;
      try {
        stats = fs.statSync(entryPath);
      } catch {
        continue;
      }
      if (stats.isDirectory()) {
        collect(entryPath, filter);
      } else {
        if (totalSize + stats.size > maxBytes) {
          truncated = true;
          return;
        }
        const content = readFileContent(entryPath);
        const lines = content.split("\n");
        const width = String(lines.length).length;
        const numbered = lines
          .map((line, i) => `${String(i + 1).padStart(width)} | ${line}`)
          .join("\n");
        parts.push(`File: ${entryPath}${os.EOL}${numbered}`);
        totalSize += stats.size;
      }
    }
  };

  const filter = buildIgnoreFilter(workspaceRoot, additionalIgnores);
  collect(dirPath, filter);

  if (!parts.length) {
    getPlatform().message.warn("No files found or total size exceeds limit.");
    return;
  }

  if (truncated) {
    getPlatform().message.warn(
      `Size limit (${maxSizeKB} KB) reached; ${parts.length} file(s) included.`
    );
  }

  try {
    await getPlatform().clipboard.writeText(parts.join(`${os.EOL}${os.EOL}`));
    getPlatform().message.info(`${parts.length} file(s) copied with line numbers.`);
  } catch (err) {
    getPlatform().message.error(`Failed to copy files: ${(err as Error).message}`);
    logger.error(
      `Failed to copy files: ${(err as Error).message}`,
      "copyFolderFilesWithLineNumbers",
      __filename
    );
  }
};

/**
 * Recursively collects all files under a folder, renders each with its VS Code
 * diagnostics appended, and writes the combined result to the clipboard.
 * In CLI mode getDiagnostics() always returns [] so each file shows "Diagnostics: none".
 */
export const copyFolderFilesWithDiagnostics = async (
  dirPath: string,
  additionalIgnores: string[] = []
): Promise<void> => {
  const maxSizeKB = getPlatform().getConfig<number>("maxRootSizeKB", 500);
  const maxBytes = maxSizeKB * 1024;
  const workspaceRoot = getPlatform().getWorkspaceRoot() ?? dirPath;

  const severityLabel = (s: DiagnosticSeverity): string => {
    switch (s) {
      case DiagnosticSeverity.Error:
        return "ERROR";
      case DiagnosticSeverity.Warning:
        return "WARNING";
      case DiagnosticSeverity.Information:
        return "INFO";
      case DiagnosticSeverity.Hint:
        return "HINT";
      default:
        return "UNKNOWN";
    }
  };

  const parts: string[] = [];
  let totalSize = 0;
  let truncated = false;

  const collect = (currentDir: string, filter: Ignore): void => {
    if (truncated) return;
    let rawEntries: fs.Dirent[];
    try {
      rawEntries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      logger.error(
        `Unable to read directory: ${currentDir} - ${(err as Error).message}`,
        "copyFolderFilesWithDiagnostics",
        __filename
      );
      return;
    }

    const entries = filterIgnoredFiles(
      currentDir,
      rawEntries.map((e) => e.name),
      workspaceRoot,
      additionalIgnores,
      filter
    );

    for (const entry of entries) {
      if (truncated) return;
      const entryPath = path.join(currentDir, entry);
      let stats: fs.Stats;
      try {
        stats = fs.statSync(entryPath);
      } catch {
        continue;
      }
      if (stats.isDirectory()) {
        collect(entryPath, filter);
      } else {
        if (totalSize + stats.size > maxBytes) {
          truncated = true;
          return;
        }
        const content = readFileContent(entryPath);
        const diagnostics: DiagnosticItem[] = getPlatform().getDiagnostics(entryPath);

        let block = `File: ${entryPath}${os.EOL}${content}`;

        if (diagnostics.length === 0) {
          block += `${os.EOL}${os.EOL}Diagnostics: none`;
        } else {
          const lineWidth = String(
            Math.max(...diagnostics.map((d) => d.range.start.line + 1))
          ).length;
          const diagLines = diagnostics.map((d) => {
            const line = String(d.range.start.line + 1).padStart(lineWidth);
            const sev = severityLabel(d.severity);
            const code = d.code ? ` [${d.code}]` : "";
            const src = d.source ? ` (${d.source})` : "";
            return `  Line ${line} | ${sev}${src}${code} ${d.message}`;
          });
          const issueWord = diagnostics.length === 1 ? "issue" : "issues";
          block += `${os.EOL}${os.EOL}Diagnostics (${diagnostics.length} ${issueWord}):${os.EOL}${diagLines.join(os.EOL)}`;
        }

        parts.push(block);
        totalSize += stats.size;
      }
    }
  };

  const filter = buildIgnoreFilter(workspaceRoot, additionalIgnores);
  collect(dirPath, filter);

  if (!parts.length) {
    getPlatform().message.warn("No files found or total size exceeds limit.");
    return;
  }

  if (truncated) {
    getPlatform().message.warn(
      `Size limit (${maxSizeKB} KB) reached; ${parts.length} file(s) included.`
    );
  }

  try {
    await getPlatform().clipboard.writeText(parts.join(`${os.EOL}${os.EOL}`));
    getPlatform().message.info(`${parts.length} file(s) copied with diagnostics.`);
  } catch (err) {
    getPlatform().message.error(`Failed to copy files: ${(err as Error).message}`);
    logger.error(
      `Failed to copy files: ${(err as Error).message}`,
      "copyFolderFilesWithDiagnostics",
      __filename
    );
  }
};

/**
 * Copies selected files' content alongside their diagnostics (errors/warnings).
 * In CLI mode getDiagnostics() always returns [] so each file shows "Diagnostics: none".
 */
export const copyFileContentWithDiagnostics = async (filePaths: string[]): Promise<void> => {
  const maxSizeKB = getPlatform().getConfig<number>("maxRootSizeKB", 500);
  const maxBytes = maxSizeKB * 1024;

  const severityLabel = (s: DiagnosticSeverity): string => {
    switch (s) {
      case DiagnosticSeverity.Error:
        return "ERROR";
      case DiagnosticSeverity.Warning:
        return "WARNING";
      case DiagnosticSeverity.Information:
        return "INFO";
      case DiagnosticSeverity.Hint:
        return "HINT";
      default:
        return "UNKNOWN";
    }
  };

  let totalSize = 0;
  const parts: string[] = [];
  let truncated = false;

  for (const filePath of filePaths) {
    let stats: fs.Stats;
    try {
      stats = fs.statSync(filePath);
    } catch {
      continue;
    }
    if (!stats.isFile()) continue;

    if (totalSize + stats.size > maxBytes) {
      truncated = true;
      break;
    }

    const fileContent = readFileContent(filePath);
    const diagnostics: DiagnosticItem[] = getPlatform().getDiagnostics(filePath);

    let block = `File: ${filePath}${os.EOL}${fileContent}`;

    if (diagnostics.length === 0) {
      block += `${os.EOL}${os.EOL}Diagnostics: none`;
    } else {
      const lineWidth = String(Math.max(...diagnostics.map((d) => d.range.start.line + 1))).length;
      const diagLines = diagnostics.map((d) => {
        const line = String(d.range.start.line + 1).padStart(lineWidth);
        const sev = severityLabel(d.severity);
        const code = d.code ? ` [${d.code}]` : "";
        const src = d.source ? ` (${d.source})` : "";
        return `  Line ${line} | ${sev}${src}${code} ${d.message}`;
      });
      const issueWord = diagnostics.length === 1 ? "issue" : "issues";
      block += `${os.EOL}${os.EOL}Diagnostics (${diagnostics.length} ${issueWord}):${os.EOL}${diagLines.join(os.EOL)}`;
    }

    parts.push(block);
    totalSize += stats.size;
  }

  if (!parts.length) {
    getPlatform().message.warn("No files to copy or total size exceeds limit.");
    return;
  }

  if (truncated) {
    getPlatform().message.warn(
      `Size limit (${maxSizeKB} KB) reached; ${parts.length} of ${filePaths.length} file(s) included.`
    );
  }

  try {
    await getPlatform().clipboard.writeText(parts.join(`${os.EOL}${os.EOL}`));
    getPlatform().message.info(`${parts.length} file(s) copied with diagnostics.`);
  } catch (err) {
    getPlatform().message.error(`Failed to copy files: ${(err as Error).message}`);
    logger.error(`Failed to copy files: ${(err as Error).message}`, "fileHelpers", __filename);
  }
};

/**
 * Copies multiple selected files as a single concatenated clipboard entry,
 * with a numbered separator header between each file.
 */
export const copyMultipleFilesContent = async (filePaths: string[]): Promise<void> => {
  const maxSizeKB = getPlatform().getConfig<number>("maxRootSizeKB", 500);
  const maxBytes = maxSizeKB * 1024;

  const fileList = filePaths.filter((p) => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });

  if (!fileList.length) {
    getPlatform().message.warn("No files selected.");
    return;
  }

  const total = fileList.length;
  const sep = "=".repeat(40);
  let totalSize = 0;
  const parts: string[] = [];
  let truncated = false;

  for (let i = 0; i < fileList.length; i++) {
    const filePath = fileList[i];
    let stats: fs.Stats;
    try {
      stats = fs.statSync(filePath);
    } catch {
      continue;
    }

    if (totalSize + stats.size > maxBytes) {
      truncated = true;
      break;
    }

    const fileContent = readFileContent(filePath);
    const header = `${sep}${os.EOL}File ${i + 1}/${total}: ${filePath}${os.EOL}${sep}`;
    parts.push(`${header}${os.EOL}${fileContent}`);
    totalSize += stats.size;
  }

  if (!parts.length) {
    getPlatform().message.warn("No files to copy or total size exceeds limit.");
    return;
  }

  if (truncated) {
    getPlatform().message.warn(
      `Size limit (${maxSizeKB} KB) reached; ${parts.length} of ${total} file(s) included.`
    );
  }

  try {
    await getPlatform().clipboard.writeText(parts.join(`${os.EOL}${os.EOL}`));
    getPlatform().message.info(`${parts.length} file(s) copied.`);
  } catch (err) {
    getPlatform().message.error(`Failed to copy files: ${(err as Error).message}`);
    logger.error(`Failed to copy files: ${(err as Error).message}`, "fileHelpers", __filename);
  }
};

/**
 * Retrieves folder structure and file contents recursively.
 * workspaceRoot is threaded through all recursive calls so that the
 * ignore filter always computes paths relative to the actual workspace root.
 */
export const getFolderStructureAndContent = (
  dir: string,
  additionalIgnores: string[] = [],
  workspaceRoot?: string,
  indent = "┣ ",
  ig?: Ignore // cached ignore filter — built once and shared across recursive calls
): string => {
  if (!dir || typeof dir !== "string") {
    logger.error(
      `Invalid directory path received: ${JSON.stringify(dir)}`,
      "getFolderStructureAndContent",
      __filename
    );
    throw new Error(`Invalid directory path: ${JSON.stringify(dir)}`);
  }

  // Establish workspaceRoot on the first (top-level) call
  const root = workspaceRoot ?? getPlatform().getWorkspaceRoot() ?? dir;

  // Build the ignore filter once and pass it to all recursive calls (BUG-2 fix).
  const filter: Ignore = ig ?? buildIgnoreFilter(root, additionalIgnores);

  logger.log(`Scanning folder: ${dir}`, "getFolderStructureAndContent", __filename);

  let structure = `${path.basename(dir)}\n`;
  let rawEntries: fs.Dirent[];

  try {
    rawEntries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    logger.error(
      `Unable to read directory: ${dir} - ${(err as Error).message}`,
      "getFolderStructureAndContent",
      __filename
    );
    return `Failed to read directory: ${dir}`;
  }

  const entries = filterIgnoredFiles(
    dir,
    rawEntries.map((e) => e.name),
    root,
    additionalIgnores,
    filter // reuse cached filter (BUG-2 fix)
  );

  for (const entry of entries) {
    const entryPath = path.join(dir, entry);
    let stats: fs.Stats;
    try {
      stats = fs.statSync(entryPath);
    } catch (err) {
      logger.error(
        `Failed to stat: ${entryPath} - ${(err as Error).message}`,
        "getFolderStructureAndContent",
        __filename
      );
      continue;
    }

    if (stats.isDirectory()) {
      structure += getFolderStructureAndContent(
        entryPath,
        additionalIgnores,
        root,
        `${indent}┃ `,
        filter // pass cached filter to recursive call
      );
    } else {
      try {
        const fileContent = fs.readFileSync(entryPath, "utf8");
        structure += `${indent}${entry}\nContent:\n${fileContent}\n\n`;
      } catch (err) {
        logger.error(
          `Failed to read file: ${entryPath} - ${(err as Error).message}`,
          "getFolderStructureAndContent",
          __filename
        );
      }
    }
  }

  return structure;
};
