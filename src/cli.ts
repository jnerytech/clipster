#!/usr/bin/env node
// src/cli.ts — Clipster CLI entry point
// Output goes to stdout so users can pipe to their clipboard tool:
//   clipster structure src/   | pbcopy
//   clipster structure src/   | xclip -selection clipboard
//   clipster structure src/   | clip      (Windows)
import path from "path";
import { initPlatform } from "./platform";
import { CliPlatform } from "./platforms/cli-platform";
import {
  getFolderStructure,
  getFolderStructureAndContent,
  copyFileContentWithPath,
  copyFileContentWithLineNumbers,
  copyFolderFilesWithLineNumbers,
  copyFolderFilesWithDiagnostics,
  copyMultipleFilesContent,
} from "./fileHelpers";

initPlatform(new CliPlatform());

const args = process.argv.slice(2);
const cmd = args[0];

function usage(): void {
  process.stderr.write(
    [
      "Usage:",
      "  clipster structure <dir>                  Copy folder structure",
      "  clipster content <dir>                    Copy folder structure + all file contents",
      "  clipster file <file...>                   Copy file(s) content with path header",
      "  clipster file --line-numbers <file...>    Copy file(s) with line numbers",
      "  clipster file --diagnostics <file...>     Copy file(s) with diagnostics",
      "  clipster folder <dir>                     Copy all files in folder",
      "  clipster folder --line-numbers <dir>      Copy all files with line numbers",
      "  clipster folder --diagnostics <dir>       Copy all files with diagnostics",
      "  clipster multi <file...>                  Copy multiple files concatenated",
      "",
      "All output goes to stdout. Pipe to your clipboard tool.",
    ].join("\n") + "\n"
  );
}

async function main(): Promise<void> {
  if (!cmd || cmd === "--help" || cmd === "-h") {
    usage();
    process.exit(0);
  }

  if (cmd === "structure") {
    const dir = path.resolve(args[1] ?? ".");
    const result = getFolderStructure(dir);
    process.stdout.write(result + "\n");
    return;
  }

  if (cmd === "content") {
    const dir = path.resolve(args[1] ?? ".");
    const result = getFolderStructureAndContent(dir);
    process.stdout.write(result + "\n");
    return;
  }

  if (cmd === "file") {
    const flag = args[1];
    if (flag === "--line-numbers") {
      const files = args.slice(2).map((f) => path.resolve(f));
      await copyFileContentWithLineNumbers(files);
    } else if (flag === "--diagnostics") {
      // getDiagnostics() returns [] in CLI — each file will show "Diagnostics: none"
      const { copyFileContentWithDiagnostics } = await import("./fileHelpers");
      const files = args.slice(2).map((f) => path.resolve(f));
      await copyFileContentWithDiagnostics(files);
    } else {
      const files = args.slice(1).map((f) => path.resolve(f));
      await copyFileContentWithPath(files);
    }
    return;
  }

  if (cmd === "folder") {
    const flag = args[1];
    if (flag === "--line-numbers") {
      const dir = path.resolve(args[2] ?? ".");
      await copyFolderFilesWithLineNumbers(dir);
    } else if (flag === "--diagnostics") {
      const dir = path.resolve(args[2] ?? ".");
      await copyFolderFilesWithDiagnostics(dir);
    } else {
      const dir = path.resolve(args[1] ?? ".");
      await copyFolderFilesWithLineNumbers(dir);
    }
    return;
  }

  if (cmd === "multi") {
    const files = args.slice(1).map((f) => path.resolve(f));
    await copyMultipleFilesContent(files);
    return;
  }

  process.stderr.write(`[error] Unknown command: ${cmd}\n`);
  usage();
  process.exit(1);
}

main().catch((err: unknown) => {
  process.stderr.write(`[error] ${(err as Error).message}\n`);
  process.exit(1);
});
