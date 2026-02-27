# Clipster – Claude Code Guide

## Project Overview

**Clipster** is a VS Code extension (publisher: `conzeon`) that lets users copy file paths, folder structures, and file contents from the VS Code Explorer to the clipboard, as well as create files/folders from clipboard content and copy/paste files between folders.

- **Version**: 1.2.106 (see `package.json` / `.version`)
- **VS Code engine**: `^1.93.0`
- **Entry point**: `src/extension.js` → compiled to `dist/extension.js`
- **Repository**: https://github.com/TheJesper/clipster

---

## Architecture

### Source files (`src/`)

| File | Role |
|---|---|
| `extension.js` | VS Code extension entry point – registers all commands via `activate()` |
| `fileHelpers.js` | Core logic: folder structure, file content, create-from-clipboard operations |
| `main.js` | Higher-level command handlers that wrap `fileHelpers` functions |
| `ignoreHelper.js` | Filters files using `.gitignore` + `clipster.additionalIgnores` (uses `ignore` package) |
| `clipboardHelper.js` | Thin wrapper around `vscode.env.clipboard.writeText` |
| `fileUtils.js` | `isFile`, `readFileContent`, copy/paste file helpers |
| `directoryUtils.js` | Recursive directory traversal |
| `structureFormatter.js` | Formats root-folder header for clipboard output |
| `pathUtils.js` | `getBaseDirectory`, `resolveTargetPath` helpers |
| `messageUtils.js` | Wraps `vscode.window.showErrorMessage` / `showInformationMessage` |
| `logger.js` | Lightweight logger that writes to a VS Code Output Channel |
| `command/commandHandlers.js` | Additional command handler functions |
| `command/commandManager.js` | Command registration helpers |

### Module system note

`extension.js` uses **CommonJS** (`require` / `module.exports`).
All other source files use **ESM** (`import` / `export`).
Babel (`@babel/preset-env`) transpiles ESM → CJS during the Webpack build.

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
| Babel | `.babelrc` | Transpiles ESM → CJS; presets: `@babel/preset-env` |
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
| VS Code mock | `src/test/__mocks__/vscode.js` |

```bash
npm test             # Run all Jest tests with coverage
npm run test:quick   # Run only changed tests
npm run test:failed  # Re-run only previously failing tests
```

### Test file status

- `src/test/logger.test.js` — **active** (only passing test suite)
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

`src/ignoreHelper.js` (`filterIgnoredFiles`) merges:
1. `.gitignore` from the workspace root
2. `clipster.additionalIgnores` setting

It uses the [`ignore`](https://www.npmjs.com/package/ignore) npm package to apply gitignore-style pattern matching.

---

## Key Dependencies

| Package | Use |
|---|---|
| `ignore` | gitignore-style file filtering |
| `picomatch` | Glob matching |
| `webpack` + `babel-loader` | Build/transpile |
| `jest` | Unit testing |
| `standard-version` | Versioning/changelog |
| `@vscode/vsce` | Package and publish the extension |

---

## Known Issues / Gotchas

1. **Import typo in `extension.js`**: imports `copyFilecopyFileContentWithPath` from `fileHelpers.js` (line 14) but calls `copyFileContentWithPath` — the function referenced at call sites is the correctly named ESM export; Webpack resolves this during bundling, but it's a latent inconsistency.
2. **Mixed module systems**: `extension.js` is CJS while all helpers are ESM. Babel handles this in the bundle, but running helpers directly with Node.js requires transpilation.
3. **Tests disabled**: Most test files carry a `.jsREM` suffix, excluding them from Jest. Only `logger.test.js` is active. Restoring tests requires renaming files back to `.test.js` and fixing any broken imports.
4. **`main.js` is not the extension entry**: `src/main.js` contains handler wrappers but is not wired into Webpack as an entry point. `extension.js` duplicates some of this logic inline.
5. **`clipster.showSystemCopyPaste` config key**: `extension.js` checks `config.get("clipster.showSystemCopyPaste", true)` but this setting is not declared in `package.json`'s `contributes.configuration` — it always evaluates to the default `true`.
