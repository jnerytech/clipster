# Clipster – Claude Code Guide

## Project Overview

**Clipster** is a VS Code extension (publisher: `conzeon`) that lets users copy file paths, folder structures, and file contents from the VS Code Explorer to the clipboard, as well as create files/folders from clipboard content and copy/paste files between folders.

- **Version**: see `package.json` (authoritative; any `.version` file is legacy/stale and not used)
- **VS Code engine**: `^1.93.0`
- **Entry point**: `src/extension.ts` → compiled to `dist/extension.js`
- **Repository**: https://github.com/TheJesper/clipster

---

## Architecture

### Source files (`src/`)

| File                    | Role                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `extension.ts`          | VS Code extension entry point – registers all commands via `activate()`, re-registers on config change |
| `fileHelpers.ts`        | Core logic: folder structure, file content, create-from-clipboard operations                           |
| `ignoreHelper.ts`       | Filters files using `.gitignore` + `clipster.additionalIgnores` (uses `ignore` package)                |
| `clipboardHelper.ts`    | Thin wrapper around `vscode.env.clipboard.writeText`                                                   |
| `fileUtils.ts`          | `isFile`, `readFileContent`, copy/paste file helpers                                                   |
| `directoryUtils.ts`     | Recursive directory traversal                                                                          |
| `structureFormatter.ts` | Formats root-folder header for clipboard output                                                        |
| `pathUtils.ts`          | `getBaseDirectory`, `resolveTargetPath` helpers                                                        |
| `messageUtils.ts`       | Wraps `vscode.window.showErrorMessage` / `showInformationMessage`                                      |
| `logger.ts`             | Lightweight logger that writes to a VS Code Output Channel                                             |

### Module system note

All source files use **TypeScript** (`ES2020` target) and are compiled to CommonJS by `ts-loader` during the Webpack build.

### Extension lifecycle

- `activate()` calls `registerCommands()` and subscribes to `onDidChangeConfiguration`
- Any change to a `clipster.*` setting triggers a full re-registration of all commands
- `deactivate()` disposes all registered command disposables

---

## Commands Registered

| Command ID                                   | Title                                  |
| -------------------------------------------- | -------------------------------------- |
| `clipster.createFileFromClipboard`           | Create File or Folder from Clipboard   |
| `clipster.copyFolderStructure`               | Copy Folder Structure                  |
| `clipster.copyFolderStructureAndContent`     | Copy Folder Structure and Content      |
| `clipster.copyFileContentWithHeader`         | Copy File(s) Content with Path         |
| `clipster.copyRootFolderPath`                | Copy Root Folder Path                  |
| `clipster.copyRootFolderStructure`           | Copy Root Folder Structure             |
| `clipster.copyRootFolderStructureAndContent` | Copy Root Folder Structure and Content |
| `clipster.copyFile`                          | Copy File(s) and/or Folder(s)          |
| `clipster.pasteFile`                         | Paste File(s) and/or Folder(s)         |

All commands are surfaced under a **Clipster** submenu in the Explorer context menu. Each command is conditionally registered via `registerConditionalCommand()` based on its corresponding `clipster.*` boolean setting.

---

## Build System

| Tool             | Config file          | Purpose                                                                                         |
| ---------------- | -------------------- | ----------------------------------------------------------------------------------------------- |
| Webpack 5        | `webpack.config.cjs` | Bundles extension into `dist/extension.js`; copies `resources/**/*` to `dist/` via `CopyPlugin` |
| TypeScript       | `tsconfig.json`      | Type-checks and compiles `.ts` sources via `ts-loader`                                          |
| standard-version | —                    | Automated semantic versioning                                                                   |
| rimraf           | —                    | Clean `out/` directory                                                                          |

### Common build commands

```bash
npm run type-check          # Type-check only (tsc --noEmit)
npm run build               # Type-check + production Webpack bundle
npm run webpack             # Development Webpack bundle (no type-check)
npm run clean               # Remove ./out
npm run bump-build          # Bump version + production build
npm run clean-build-install # Full clean → bump → build → install
npm run install-extension   # Install .vsix via node build.js
npm run release             # standard-version release
```

---

## Testing

| Tool         | Config                                 |
| ------------ | -------------------------------------- |
| Jest 29      | `jest.config.js`                       |
| ts-jest      | `jest.config.js` (`preset: "ts-jest"`) |
| VS Code mock | `src/test/__mocks__/vscode.ts`         |

```bash
npm test             # Run all Jest tests with coverage
npm run test:quick   # Run only changed tests
npm run test:failed  # Re-run only previously failing tests
```

### Test file status

All test files in `src/test/` are active `.test.ts` files. Note that `jest` must be installed (`npm install`) before tests can run.

| Test file                    | Coverage area                 |
| ---------------------------- | ----------------------------- |
| `logger.test.ts`             | Logger output channel         |
| `clipboardHelper.test.ts`    | Clipboard write helper        |
| `directoryUtils.test.ts`     | Directory traversal           |
| `extension.test.ts`          | Extension activate/deactivate |
| `fileHelpers.test.ts`        | Core file operations          |
| `fileUtils.test.ts`          | File utility helpers          |
| `ignoreHelper.test.ts`       | Gitignore filter logic        |
| `messageUtils.test.ts`       | Error/info message wrappers   |
| `pathUtils.test.ts`          | Path resolution helpers       |
| `structureFormatter.test.ts` | Root folder header formatting |

---

## VS Code Settings (`clipster.*`)

| Setting                                 | Type    | Default | Description                                                                                                                       |
| --------------------------------------- | ------- | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `showCreateFileFromClipboard`           | boolean | `true`  | Enable create-from-clipboard command                                                                                              |
| `showCopyFolderStructure`               | boolean | `true`  | Enable copy folder structure                                                                                                      |
| `showCopyFolderStructureAndContent`     | boolean | `true`  | Enable copy folder structure + content                                                                                            |
| `showCopyFileContentWithHeader`         | boolean | `true`  | Enable copy file content with path                                                                                                |
| `showCopyRootFolderPath`                | boolean | `true`  | Enable copy root folder path                                                                                                      |
| `showCopyRootFolderStructure`           | boolean | `true`  | Enable copy root folder structure                                                                                                 |
| `showCopyRootFolderStructureAndContent` | boolean | `true`  | Enable copy root folder structure + content                                                                                       |
| `showCopyFile`                          | boolean | `true`  | Enable copy file/folder                                                                                                           |
| `showPasteFile`                         | boolean | `true`  | Enable paste file/folder                                                                                                          |
| `showCopyFileContents`                  | boolean | `true`  | Enable copying file contents only                                                                                                 |
| `showInClipsterSubmenu`                 | boolean | `true`  | Declared in `package.json` but has no effect – not read by `extension.ts` or referenced in menu `when` clauses (see Known Issues) |
| `additionalIgnores`                     | array   | `[]`    | Extra glob patterns to ignore when scanning                                                                                       |
| `maxRootFiles`                          | integer | `10`    | Max files for root-folder copy-with-content                                                                                       |
| `maxRootSizeKB`                         | integer | `500`   | Max total KB for root-folder copy-with-content                                                                                    |

---

## Ignore Handling

`src/ignoreHelper.ts` (`filterIgnoredFiles`) merges:

1. `.gitignore` from the workspace root
2. `clipster.additionalIgnores` setting

It uses the [`ignore`](https://www.npmjs.com/package/ignore) npm package to apply gitignore-style pattern matching.

---

## Key Dependencies

| Package                                       | Use                                                |
| --------------------------------------------- | -------------------------------------------------- |
| `ignore`                                      | gitignore-style file filtering                     |
| `picomatch`                                   | Glob matching                                      |
| `webpack` + `ts-loader`                       | Build/transpile                                    |
| `copy-webpack-plugin`                         | Copy `resources/` assets into `dist/` during build |
| `ts-jest`                                     | Jest TypeScript transform                          |
| `@types/jest`, `@types/node`, `@types/vscode` | TypeScript type definitions                        |
| `jest`                                        | Unit testing                                       |
| `standard-version`                            | Versioning/changelog                               |
| `@vscode/vsce`                                | Package and publish the extension                  |

---

## Known Issues / Gotchas

1. **`showCopyFileContents` not wired to a command**: The setting is declared in `package.json` but no command in `extension.ts` reads it via `registerConditionalCommand`. It has no effect.
2. **`showInClipsterSubmenu` not wired up**: The setting is declared in `package.json` but `extension.ts` does not read it and there are no `when` clauses in the menu contributions that reference it. It has no effect on whether commands appear in a submenu or the root context menu.
3. **Context menu groups**: Commands are grouped in the `clipsterMenu` submenu by group strings (`1_create`, `2_copy`, `3_copyRoot`, `4_file`). The `copyFile` and `pasteFile` entries use `when` clauses to show only for files/folders respectively.
