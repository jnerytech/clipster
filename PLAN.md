# Implementation Plan: AI Context Features

## Overview

4 new commands for providing richer context to AI agents, following existing patterns in the codebase.

---

## Feature 1 — Copy File with Line Numbers

**Command ID**: `clipster.copyFileContentWithLineNumbers`
**Setting**: `showCopyFileContentWithLineNumbers` (boolean, default: true)
**Menu group**: `2_copy` in clipsterMenu

### Output format

```
File: /workspace/src/extension.ts
   1 | import * as vscode from 'vscode';
   2 | import { registerCommands } from './commands';
   3 | ...
```

### Files to change

**`src/fileHelpers.ts`** — Add `copyFileContentWithLineNumbers(uris: vscode.Uri[])`

- Same size guard as `copyFileContentWithPath()` (uses `maxRootSizeKB`)
- Reads file content, splits by `\n`
- Pads line numbers to fixed width based on total line count
- Format each line: `${padded(n)} | ${line}`
- Writes to clipboard via `vscode.env.clipboard.writeText()`

**`src/extension.ts`** — Register command via `registerConditionalCommand()`:

```ts
registerConditionalCommand(
  "clipster.copyFileContentWithLineNumbers",
  "showCopyFileContentWithLineNumbers",
  async (uri, allUris) => {
    const uris = [...(allUris || [uri])].filter(Boolean);
    await copyFileContentWithLineNumbers(uris as vscode.Uri[]);
  }
);
```

**`package.json`** — 3 additions:

1. Command declaration in `contributes.commands`
2. Menu entry in `clipsterMenu` group `2_copy`
3. Setting `clipster.showCopyFileContentWithLineNumbers`

**`src/test/fileHelpers.test.ts`** — Add unit tests for the new function

---

## Feature 2 — Copy Selection with File Path and Line Range

**Command ID**: `clipster.copySelectionWithContext`
**Setting**: `showCopySelectionWithContext` (boolean, default: true)
**Menu**: `editor/context` (not Explorer — this operates on active editor selection)

### Output format

````
File: /workspace/src/extension.ts (lines 42-57)
```ts
const result = await getFolderStructure(dir, additionalIgnores);
await copyToClipboard(result);
````

````

### Files to change

**`src/fileHelpers.ts`** — Add `copySelectionWithContext(editor: vscode.TextEditor)`
- Reads `editor.document.uri.fsPath` for path
- Reads `editor.selection` for start/end lines (1-based in output)
- Reads `editor.document.getText(editor.selection)` for content
- Detects language from `editor.document.languageId` for code fence
- Writes formatted output to clipboard

**`src/extension.ts`** — Register command (no URI args; uses active editor):
```ts
registerConditionalCommand("clipster.copySelectionWithContext", "showCopySelectionWithContext", async () => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { showErrorMessage("No active editor."); return; }
  if (editor.selection.isEmpty) { showErrorMessage("No text selected."); return; }
  await copySelectionWithContext(editor);
});
````

**`package.json`** — 3 additions:

1. Command declaration
2. Menu entry in `editor/context` with `when: editorHasSelection`
3. Setting `clipster.showCopySelectionWithContext`

**`src/test/fileHelpers.test.ts`** — Add unit tests

---

## Feature 3 — Copy File Content + VS Code Diagnostics

**Command ID**: `clipster.copyFileContentWithDiagnostics`
**Setting**: `showCopyFileContentWithDiagnostics` (boolean, default: true)
**Menu group**: `2_copy` in clipsterMenu

### Output format

```
File: /workspace/src/extension.ts
<file content>

Diagnostics (3 issues):
  Line  5 | ERROR   [ts(2304)] Cannot find name 'foo'
  Line 12 | WARNING [eslint]   Unexpected console statement
  Line 18 | ERROR   [ts(2345)] Argument of type 'string' is not assignable...
```

### Files to change

**`src/fileHelpers.ts`** — Add `copyFileContentWithDiagnostics(uris: vscode.Uri[])`

- For each URI: reads file content + calls `vscode.languages.getDiagnostics(uri)`
- Maps `vscode.Diagnostic` severity enum → `ERROR | WARNING | INFO | HINT`
- Formats diagnostics block appended after content
- If no diagnostics: appends `Diagnostics: none`
- Writes combined output to clipboard

**`src/extension.ts`** — Register via `registerConditionalCommand()` with multi-URI support

**`package.json`** — 3 additions:

1. Command declaration: `"title": "Copy File Content with Diagnostics"`
2. Menu entry in `clipsterMenu` group `2_copy`
3. Setting `clipster.showCopyFileContentWithDiagnostics`

**`src/test/fileHelpers.test.ts`** — Add unit tests (mock `vscode.languages.getDiagnostics`)

---

## Feature 4 — Copy Multiple Selected Files (Concatenated)

**Command ID**: `clipster.copyMultipleFilesContent`
**Setting**: `showCopyMultipleFilesContent` (boolean, default: true)
**Menu group**: `2_copy` in clipsterMenu

> **Note**: The existing `copyFileContentWithHeader` already accepts multiple URIs internally, but the Explorer multi-selection (`allUris`) may not work reliably for all users. This creates an explicit command that makes multi-file copy a first-class operation with a clear separator format.

### Output format

```
========================================
File 1/3: /workspace/src/extension.ts
========================================
<content of extension.ts>

========================================
File 2/3: /workspace/src/fileHelpers.ts
========================================
<content of fileHelpers.ts>

========================================
File 3/3: /workspace/src/fileUtils.ts
========================================
<content of fileUtils.ts>
```

### Files to change

**`src/fileHelpers.ts`** — Add `copyMultipleFilesContent(uris: vscode.Uri[])`

- Filters to files only (skips folders, or recurse into them optionally — start with files only)
- Applies `maxRootSizeKB` guard
- Formats each file with numbered separator header
- Shows count of files copied in success message

**`src/extension.ts`** — Register with multi-URI support (same pattern as `copyFileContentWithHeader`)

**`package.json`** — 3 additions:

1. Command declaration: `"title": "Copy Multiple Files Content"`
2. Menu entry in `clipsterMenu` group `2_copy` with `when: explorerResourceIsFile`
3. Setting `clipster.showCopyMultipleFilesContent`

**`src/test/fileHelpers.test.ts`** — Add unit tests

---

## Execution Order

1. Feature 1 (line numbers) — simplest, pure file reading + formatting
2. Feature 4 (multi-file) — extends existing multi-URI pattern
3. Feature 3 (diagnostics) — introduces new VS Code API (`getDiagnostics`)
4. Feature 2 (selection) — touches editor context menu (different from Explorer)

## Files touched in total

| File                           | Changes                                   |
| ------------------------------ | ----------------------------------------- |
| `src/fileHelpers.ts`           | +4 new exported functions                 |
| `src/extension.ts`             | +4 `registerConditionalCommand()` calls   |
| `package.json`                 | +4 commands, +4 menu entries, +4 settings |
| `src/test/fileHelpers.test.ts` | +tests for each new function              |
