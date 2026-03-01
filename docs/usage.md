# Clipster – Usage Guide

## Getting Started

1. **Right-click** on any file or folder in the VS Code Explorer.
2. **Select** one of the options from the **Clipster** submenu.

---

## Commands

### Create File or Folder from Clipboard

Creates one or multiple files or folders from paths stored in your clipboard.

1. Copy the target paths to your clipboard (one path per line for multiple items).
2. Right-click the destination directory in the Explorer.
3. Select **Create File or Folder from Clipboard**.
4. Confirm when prompted.

> When the clipboard contains multiple lines, Clipster asks for confirmation before proceeding to prevent accidental creation from unintended content. Created files are opened in VS Code automatically.

---

### Copy Folder Structure

Right-click a folder and choose one of:

| Command                               | Description                                |
| ------------------------------------- | ------------------------------------------ |
| **Copy Folder Structure**             | Tree view of the folder — no file contents |
| **Copy Folder Structure and Content** | Tree view + contents of every file         |

**Example output:**

```
clipster
Path: c:\projects\clipster
┣ src/
┃ ┣ utils/
┃ ┃ ┗ helper.js
┃ ┗ main.js
┣ assets/
┃ ┗ logo.png
┗ README.md
```

---

### Copy File Content

Right-click a file and choose one of:

| Command                                 | Description                                         |
| --------------------------------------- | --------------------------------------------------- |
| **Copy File(s) Content with Path**      | File content with a path header                     |
| **Copy File Content with Line Numbers** | File content with line numbers prepended            |
| **Copy File Content with Diagnostics**  | File content + any VS Code errors/warnings          |
| **Copy Multiple Files (Concatenated)**  | Multiple selected files in a single clipboard entry |

---

### Copy Root Folder

Available from the **Root Folder** nested submenu:

| Command                                    | Description                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| **Copy Root Folder Path**                  | Absolute path of the workspace root                                    |
| **Copy Root Folder Structure**             | Tree view of the entire workspace root                                 |
| **Copy Root Folder Structure and Content** | Tree + all file contents (limited by `maxRootFiles` / `maxRootSizeKB`) |

---

### Copy and Paste Files

| Command                            | Description                                                |
| ---------------------------------- | ---------------------------------------------------------- |
| **Copy File(s) and/or Folder(s)**  | Stores the file/folder path in the clipboard               |
| **Paste File(s) and/or Folder(s)** | Pastes the previously copied item into the selected folder |

Works like copy/paste in a file manager.

---

### AI Context Commands

These commands appear in both the Explorer context menu (files) and the editor context menu (selections):

| Command                                 | Best for                                              |
| --------------------------------------- | ----------------------------------------------------- |
| **Copy File Content with Line Numbers** | Sharing code with AI tools that cite line numbers     |
| **Copy Selection with File Context**    | Sharing a snippet with its file path + line range     |
| **Copy File Content with Diagnostics**  | Including TypeScript/ESLint errors alongside the code |
