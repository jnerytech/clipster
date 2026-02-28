# Clipster – Claude Code Guide

## Project Overview

**Clipster** is a VS Code extension (publisher: `conzeon`) that lets users copy file paths, folder structures, and file contents from the VS Code Explorer to the clipboard, as well as create files/folders from clipboard content and copy/paste files between folders.

- **Version**: 1.2.106 (see `package.json` / `.version`)
- **VS Code engine**: `^1.93.0`
- **Entry point**: `src/extension.ts` → compiled to `dist/extension.js`
- **Repository**: https://github.com/TheJesper/clipster

---

## Architecture

### Source files (`src/`)

| File | Role |
|---|---|
| `extension.ts` | VS Code extension entry point – registers all commands via `activate()` |
| `fileHelpers.ts` | Core logic: folder structure, file content, create-from-clipboard operations |
| `ignoreHelper.ts` | Filters files using `.gitignore` + `clipster.additionalIgnores` (uses `ignore` package) |
| `clipboardHelper.ts` | Thin wrapper around `vscode.env.clipboard.writeText` |
| `fileUtils.ts` | `isFile`, `readFileContent`, copy/paste file helpers |
| `directoryUtils.ts` | Recursive directory traversal |
| `structureFormatter.ts` | Formats root-folder header for clipboard output |
| `pathUtils.ts` | `getBaseDirectory`, `resolveTargetPath` helpers |
| `messageUtils.ts` | Wraps `vscode.window.showErrorMessage` / `showInformationMessage` |
| `logger.ts` | Lightweight logger that writes to a VS Code Output Channel |

### Module system note

All source files use **TypeScript** and are compiled to CommonJS by `ts-loader` during the Webpack build.

---

## Commands Registered

| Command ID | Title |
|---|---|
| `clipster.createFileFromClipboard` | Create File or Folder from Clipboard |
| `clipster.copyFolderStructure` | Copy Folder Structure |
| `clipster.copyFolderStructureAndContent` | Copy Folder Structure and Content |
| `clipster.copyFileContentWithHeader` | Copy File(s) Content with Path |
| `clipster.copyRootFolderPath` | Copy Root Folder Path |
| `clipster.copyRootFolderStructure` | Copy Root Folder Structure |
| `clipster.copyRootFolderStructureAndContent` | Copy Root Folder Structure and Content |
| `clipster.copyFile` | Copy File(s) and/or Folder(s) |
| `clipster.pasteFile` | Paste File(s) and/or Folder(s) |

All commands are surfaced under a **Clipster** submenu in the Explorer context menu. Each command can be individually toggled via VS Code settings.

---

## Build System

| Tool | Config file | Purpose |
|---|---|---|
| Webpack 5 | `webpack.config.cjs` | Bundles extension into `dist/extension.js` |
| TypeScript | `tsconfig.json` | Type-checks and compiles `.ts` sources via `ts-loader` |
| standard-version | — | Automated semantic versioning |
| rimraf | — | Clean `out/` directory |

### Common build commands

```bash
npm run build               # Production Webpack bundle
npm run webpack             # Development Webpack bundle
npm run clean               # Remove ./out
npm run bump-build          # Bump version + production build
npm run clean-build-install # Full clean → bump → build → install
npm run install-extension   # Install .vsix via node build.js
npm run release             # standard-version release
```

---

## Testing

| Tool | Config |
|---|---|
| Jest 29 | `jest.config.js` |
| ts-jest | `jest.config.js` (`preset: "ts-jest"`) |
| VS Code mock | `src/test/__mocks__/vscode.ts` |

```bash
npm test             # Run all Jest tests with coverage
npm run test:quick   # Run only changed tests
npm run test:failed  # Re-run only previously failing tests
```

### Test file status

- `src/test/logger.test.ts` — **active** (only passing test suite)
- `src/test/*.jsREM` — disabled (renamed with `.jsREM` extension)
- `test/` — Mocha/VS Code integration test scaffold (not fully wired)

> **Note**: The README explicitly states "The tests are currently not passing." Most test files have been renamed `.jsREM` to exclude them from the Jest run.

---

## VS Code Settings (`clipster.*`)

| Setting | Type | Default | Description |
|---|---|---|---|
| `showCreateFileFromClipboard` | boolean | `true` | Enable create-from-clipboard command |
| `showCopyFolderStructure` | boolean | `true` | Enable copy folder structure |
| `showCopyFolderStructureAndContent` | boolean | `true` | Enable copy folder structure + content |
| `showCopyFileContentWithHeader` | boolean | `true` | Enable copy file content with path |
| `showCopyRootFolderPath` | boolean | `true` | Enable copy root folder path |
| `showCopyRootFolderStructure` | boolean | `true` | Enable copy root folder structure |
| `showCopyRootFolderStructureAndContent` | boolean | `true` | Enable copy root folder structure + content |
| `showCopyFile` | boolean | `true` | Enable copy file/folder |
| `showPasteFile` | boolean | `true` | Enable paste file/folder |
| `showInClipsterSubmenu` | boolean | `true` | Show commands in submenu vs. root context menu |
| `additionalIgnores` | array | `[]` | Extra glob patterns to ignore when scanning |
| `maxRootFiles` | integer | `10` | Max files for root-folder copy-with-content |
| `maxRootSizeKB` | integer | `500` | Max total KB for root-folder copy-with-content |

---

## Ignore Handling

`src/ignoreHelper.ts` (`filterIgnoredFiles`) merges:
1. `.gitignore` from the workspace root
2. `clipster.additionalIgnores` setting

It uses the [`ignore`](https://www.npmjs.com/package/ignore) npm package to apply gitignore-style pattern matching.

---

## Key Dependencies

| Package | Use |
|---|---|
| `ignore` | gitignore-style file filtering |
| `picomatch` | Glob matching |
| `webpack` + `ts-loader` | Build/transpile |
| `ts-jest` | Jest TypeScript transform |
| `@types/jest`, `@types/node`, `@types/vscode` | TypeScript type definitions |
| `jest` | Unit testing |
| `standard-version` | Versioning/changelog |
| `@vscode/vsce` | Package and publish the extension |

---

## Known Issues / Gotchas

1. **Tests disabled**: Most test files carry a `.jsREM` suffix, excluding them from Jest. Only `logger.test.ts` is active. Restoring tests requires renaming files back to `.test.ts` and fixing any broken imports.
2. **`clipster.showSystemCopyPaste` config key**: `extension.ts` checks `config.get("clipster.showSystemCopyPaste", true)` but this setting is not declared in `package.json`'s `contributes.configuration` — it always evaluates to the default `true`.
