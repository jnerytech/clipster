#!/usr/bin/env node
// src/cli.ts — Clipster CLI entry point (powered by Commander.js)
// Output goes to stdout so users can pipe to their clipboard tool:
//   clipster structure src/   | pbcopy
//   clipster structure src/   | xclip -selection clipboard
//   clipster structure src/   | clip      (Windows)
import path from "path";
import { Command } from "commander";
import { initPlatform } from "./platform";
import { CliPlatform } from "./platforms/cli-platform";
import {
  getFolderStructure,
  getFolderStructureAndContent,
  copyFileContentWithPath,
  copyFileContentWithLineNumbers,
  copyFileContentWithDiagnostics,
  copyFolderFilesWithLineNumbers,
  copyFolderFilesWithDiagnostics,
  copyMultipleFilesContent,
} from "./fileHelpers";

initPlatform(new CliPlatform());

const program = new Command();

program
  .name("clipster")
  .description("Copy file paths, folder structures, and file contents to stdout.")
  .version("1.3.2");

program
  .command("structure <dir>")
  .description("Folder structure tree (no file contents)")
  .action((dir: string) => {
    const result = getFolderStructure(path.resolve(dir));
    process.stdout.write(result + "\n");
  });

program
  .command("content <dir>")
  .description("Folder structure + all file contents")
  .action((dir: string) => {
    const result = getFolderStructureAndContent(path.resolve(dir));
    process.stdout.write(result + "\n");
  });

program
  .command("file <files...>")
  .description("File(s) content with path header")
  .option("-n, --line-numbers", "Prefix each line with its line number")
  .option("-d, --diagnostics", "Append VS Code diagnostics per file (always 'none' in CLI)")
  .action(async (files: string[], opts: { lineNumbers?: boolean; diagnostics?: boolean }) => {
    const resolved = files.map((f) => path.resolve(f));
    if (opts.diagnostics) {
      await copyFileContentWithDiagnostics(resolved);
    } else if (opts.lineNumbers) {
      await copyFileContentWithLineNumbers(resolved);
    } else {
      await copyFileContentWithPath(resolved);
    }
  });

program
  .command("folder <dir>")
  .description("All files in folder, recursively")
  .option("-n, --line-numbers", "Prefix each line with its line number (default)")
  .option("-d, --diagnostics", "Append VS Code diagnostics per file (always 'none' in CLI)")
  .action(async (dir: string, opts: { lineNumbers?: boolean; diagnostics?: boolean }) => {
    const resolved = path.resolve(dir);
    if (opts.diagnostics) {
      await copyFolderFilesWithDiagnostics(resolved);
    } else {
      await copyFolderFilesWithLineNumbers(resolved);
    }
  });

program
  .command("multi <files...>")
  .description("Multiple files concatenated with separators")
  .action(async (files: string[]) => {
    const resolved = files.map((f) => path.resolve(f));
    await copyMultipleFilesContent(resolved);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  process.stderr.write(`[error] ${(err as Error).message}\n`);
  process.exit(1);
});
