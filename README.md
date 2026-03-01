# Clipster

A minimal VS Code extension to copy file paths, folder structures, and contents from the file explorer to the clipboard so that it can be shared with ChatGPT, Gemini, Perplexity, or even real humans.

## Features

- **Create File or Folder from Clipboard**: Creates one or multiple files or folders based on the paths in your clipboard.

- **Copy Folder Structure**: Copies the folder structure without including file contents.
- **Copy Folder Structure and Content**: Copies the folder structure along with file contents.
- **Copy File Content with Path**: Copies both the file's content and its full path to the clipboard.
- **Copy Root Folder Path**: Copies the path of the root folder.
- **Copy Root Folder Structure**: Copies the root folder's structure without file contents.
- **Copy Root Folder Structure and Content**: Copies the root folder's structure along with all file contents.

### **Copy and Paste Files**

- **Copy File**: Copies a file's path to the clipboard, enabling it to be pasted into another folder.
- **Paste File**: Pastes a previously copied file into the selected folder.
- **Copy File Contents**: Copies only the contents of a file to the clipboard (without its path).

Now you can copy and paste files just like in Windows Explorer!

### **AI Context Commands**

- **Copy File Content with Line Numbers**: Copies the file content with line numbers prepended — ideal for sharing code with AI tools that reference specific lines.
- **Copy Selection with File Context**: Copies the selected text along with the file path and line range for precise AI context.
- **Copy File Content with Diagnostics**: Copies the file content along with any VS Code diagnostics (errors/warnings) attached to it.
- **Copy Multiple Files (Concatenated)**: Copies the content of multiple selected files concatenated into a single clipboard entry.

## Usage

1. **Right-click** on any file or folder in the VS Code explorer.
2. **Select** one of the options from the **Clipster** menu.

### Creating Files or Folders from Clipboard

To create one or multiple files or folders from clipboard content:

1. **Copy** the paths of the files or folders you wish to create to your clipboard. Each path should be on a new line for multiple items.
2. **Right-click** on the directory in the VS Code explorer where you want to create the new files or folders.
3. **Select** **Create File or Folder from Clipboard** from the **Clipster** menu.
4. **Confirm** the action when prompted.

**Note:** When your clipboard contains multiple lines, Clipster will ask for confirmation before proceeding to create the files or folders. This is to prevent accidental creation from unintended clipboard content.

The extension will create the files or folders at the specified paths, relative to the location where you right-clicked, and open any created files in VS Code.

### Copying Folder Structures and Contents

- **Copy Folder Structure**: Copies the folder structure of the selected directory without including file contents.
- **Copy Folder Structure and Content**: Copies the folder structure along with the contents of all files.
- **Copy File Content with Path**: Copies the content of the selected file along with its full path.

### Copying Root Folder Information

- **Copy Root Folder Path**: Copies the path of the root folder of your workspace.
- **Copy Root Folder Structure**: Copies the root folder's structure without file contents.
- **Copy Root Folder Structure and Content**: Copies the root folder's structure along with all file contents, but applies limits to the number of files and total size (default: max 10 files, 500KB total).

### Copy and Paste Files

- **Copy File**: Right-click a file and select **Copy File** to store its path in the clipboard.
- **Paste File**: Right-click a folder and select **Paste File** to paste the copied file into the selected folder.
- **Copy File Contents**: Right-click a file and select **Copy File Contents** to copy only the content of the file (without its path) to the clipboard.

## Example

Here is an example of a copied folder structure:

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

This feature helps you easily share the structure of your projects with others, humans or androids!

## Settings

You can customize Clipster's behavior through the following settings in the VS Code settings:

**To access settings**: Go to **File > Preferences > Settings** (Windows/Linux) or **Code > Preferences > Settings** (macOS), then search for "Clipster".

- **Clipster: Show Create File from Clipboard** (`clipster.showCreateFileFromClipboard`): Enable or disable creating files or folders from clipboard content.
- **Clipster: Show Copy Folder Structure** (`clipster.showCopyFolderStructure`): Enable or disable copying the folder structure.
- **Clipster: Show Copy Folder Structure and Content** (`clipster.showCopyFolderStructureAndContent`): Enable or disable copying the folder structure along with content.
- **Clipster: Show Copy File Content with Path** (`clipster.showCopyFileContentWithHeader`): Enable or disable copying file content with the path.
- **Clipster: Show Copy Root Folder Path** (`clipster.showCopyRootFolderPath`): Enable or disable copying the root folder path.
- **Clipster: Show Copy Root Folder Structure** (`clipster.showCopyRootFolderStructure`): Enable or disable copying the root folder structure.
- **Clipster: Show Copy Root Folder Structure and Content** (`clipster.showCopyRootFolderStructureAndContent`): Enable or disable copying the root folder structure along with content.
- **Clipster: Max Root Files** (`clipster.maxRootFiles`): Sets the maximum number of files that can be copied from the root folder (default: 10).
- **Clipster: Max Root Size KB** (`clipster.maxRootSizeKB`): Sets the maximum total size (in KB) for copied root files (default: 500KB).
- **Clipster: Additional Ignores** (`clipster.additionalIgnores`): Add custom file patterns to ignore when copying folder structures.
- **Clipster: Show Copy File Content with Line Numbers** (`clipster.showCopyFileContentWithLineNumbers`): Enable or disable copying file content with line numbers.
- **Clipster: Show Copy Selection with Context** (`clipster.showCopySelectionWithContext`): Enable or disable copying the selected text with file path and line range.
- **Clipster: Show Copy File Content with Diagnostics** (`clipster.showCopyFileContentWithDiagnostics`): Enable or disable copying file content with VS Code diagnostics.
- **Clipster: Show Copy Multiple Files Content** (`clipster.showCopyMultipleFilesContent`): Enable or disable copying multiple selected files concatenated.

## Ignoring Files

Clipster respects `.gitignore` files when copying folder structures. You can also add custom ignore patterns using the **Clipster: Additional Ignores** setting to tailor the output to your needs.

## CLI Usage

Clipster's core commands are also available as a Node.js CLI. Output goes to **stdout** so you can pipe it directly to your clipboard tool.

### Build the CLI

```bash
npm run build:cli
```

This compiles the CLI to `dist/src/cli.js`.

### Commands

| Command                                  | Description                                     |
| ---------------------------------------- | ----------------------------------------------- |
| `clipster structure <dir>`               | Folder structure (tree view, no file contents)  |
| `clipster content <dir>`                 | Folder structure + all file contents            |
| `clipster file <file...>`                | File(s) content with path header                |
| `clipster file --line-numbers <file...>` | File(s) with line numbers                       |
| `clipster file --diagnostics <file...>`  | File(s) with diagnostics (always "none" in CLI) |
| `clipster folder <dir>`                  | All files in folder with line numbers           |
| `clipster folder --line-numbers <dir>`   | All files in folder with line numbers           |
| `clipster folder --diagnostics <dir>`    | All files in folder with diagnostics            |
| `clipster multi <file...>`               | Multiple files concatenated with separators     |

### Examples

```bash
# Pipe folder structure to clipboard
node dist/src/cli.js structure src/      | clip       # Windows
node dist/src/cli.js structure src/      | pbcopy     # macOS
node dist/src/cli.js structure src/      | xclip -selection clipboard  # Linux

# Copy a single file with its path header
node dist/src/cli.js file src/extension.ts | clip

# Copy multiple files concatenated
node dist/src/cli.js multi src/platform.ts src/fileHelpers.ts | pbcopy

# Copy all files in a folder with line numbers
node dist/src/cli.js folder src/ | clip

# Copy entire project structure + all file contents
node dist/src/cli.js content src/ | clip
```

> **Note:** Diagnostics are always reported as "none" in CLI mode — diagnostics require a running VS Code instance with language servers active.

## Installation

[GitHub Repository](https://github.com/TheJesper/clipster)

Search for Clipster in VS Code to install.

Run `npm run clean-build-install` to build and install the extension locally.

### Scripts Explained

- **test**: Runs the Jest tests.
- **webpack**: Builds the project in development mode.
- **build**: Creates a production build using Webpack.
- **build:cli**: Compiles the CLI entry point to `dist/src/cli.js`.
- **clean**: Removes the `OUT` directory.
- **bump-build**: Updates the version and builds the extension.
- **clean-build-install**: Cleans, builds, and installs the extension.
- **install-extension**: Installs the extension from the build output.
- **release**: Creates a new release version.

## License

This project is licensed under the MIT License.

**Disclaimer**: Please provide feedback to help us improve
