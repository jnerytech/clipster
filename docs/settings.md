# Clipster – Settings Reference

**To open settings**: `File > Preferences > Settings` (Windows/Linux) or `Code > Preferences > Settings` (macOS), then search for **Clipster**.

---

## Visibility Toggles

Each command can be individually enabled or disabled. Disabled commands are hidden from the context menu.

| Setting                                          | Default | Description                            |
| ------------------------------------------------ | ------- | -------------------------------------- |
| `clipster.showCreateFileFromClipboard`           | `true`  | Create File or Folder from Clipboard   |
| `clipster.showCopyFolderStructure`               | `true`  | Copy Folder Structure                  |
| `clipster.showCopyFolderStructureAndContent`     | `true`  | Copy Folder Structure and Content      |
| `clipster.showCopyFileContentWithHeader`         | `true`  | Copy File(s) Content with Path         |
| `clipster.showCopyRootFolderPath`                | `true`  | Copy Root Folder Path                  |
| `clipster.showCopyRootFolderStructure`           | `true`  | Copy Root Folder Structure             |
| `clipster.showCopyRootFolderStructureAndContent` | `true`  | Copy Root Folder Structure and Content |
| `clipster.showCopyFile`                          | `true`  | Copy File(s) and/or Folder(s)          |
| `clipster.showPasteFile`                         | `true`  | Paste File(s) and/or Folder(s)         |
| `clipster.showCopyFileContentWithLineNumbers`    | `true`  | Copy File Content with Line Numbers    |
| `clipster.showCopySelectionWithContext`          | `true`  | Copy Selection with File Context       |
| `clipster.showCopyFileContentWithDiagnostics`    | `true`  | Copy File Content with Diagnostics     |
| `clipster.showCopyMultipleFilesContent`          | `true`  | Copy Multiple Files (Concatenated)     |
| `clipster.showCopyFolderFilesWithLineNumbers`    | `true`  | Copy All Files with Line Numbers       |
| `clipster.showCopyFolderFilesWithDiagnostics`    | `true`  | Copy All Files with Diagnostics        |

---

## Root Folder Limits

These apply only to **Copy Root Folder Structure and Content** to prevent accidentally copying enormous workspaces.

| Setting                  | Default | Description                               |
| ------------------------ | ------- | ----------------------------------------- |
| `clipster.maxRootFiles`  | `10`    | Maximum number of files included          |
| `clipster.maxRootSizeKB` | `500`   | Maximum total size of included files (KB) |

---

## Ignore Patterns

Clipster merges three sources of ignore patterns when traversing folders:

1. **`clipster.defaultIgnores`** — built-in patterns, applied even without a `.gitignore`
2. **`clipster.additionalIgnores`** — your own extra patterns
3. **`.gitignore`** from the workspace root (if present)

Patterns follow [gitignore syntax](https://git-scm.com/docs/gitignore) via the [`ignore`](https://www.npmjs.com/package/ignore) package.

### Default ignore list

```json
[
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  "out/",
  "coverage/",
  "__pycache__/",
  ".DS_Store",
  "Thumbs.db",
  "*.log"
]
```

You can remove individual entries or clear the list entirely in your VS Code settings. To include `dist/` in output, for example, remove `"dist/"` from `clipster.defaultIgnores`.

### Adding custom patterns

Use `clipster.additionalIgnores` to add patterns on top of the defaults:

```json
"clipster.additionalIgnores": [
  "*.generated.ts",
  "tmp/",
  "**/*.snap"
]
```
