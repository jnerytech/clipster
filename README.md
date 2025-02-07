# Clipster

A minimal VS Code extension to copy file paths, folder structures, and contents from the file explorer to the clipboard so that it can be shared with ChatGPT, Gemini, Perplexity, or even real humans 😊. Feedback === ❤️

## Features

- 📋 **Create File or Folder from Clipboard**: Creates one or multiple files or folders based on the paths in your clipboard.

- 📁 **Copy Folder Structure**: Copies the folder structure without including file contents.
- 📁 **Copy Folder Structure and Content**: Copies the folder structure along with file contents.
- 📝 **Copy File Content with Path**: Copies both the file's content and its full path to the clipboard.
- 📁 **Copy Root Folder Path**: Copies the path of the root folder.
- 📁 **Copy Root Folder Structure**: Copies the root folder's structure without file contents.
- 📝 **Copy Root Folder Structure and Content**: Copies the root folder's structure along with all file contents.

### 🆕 **Copy and Paste Files**

- 📄 **Copy File**: Copies a file's path to the clipboard, enabling it to be pasted into another folder.
- 📄 **Paste File**: Pastes a previously copied file into the selected folder.
- 📄 **Copy File Contents**: Copies only the contents of a file to the clipboard (without its path).

Now you can copy and paste files just like in Windows Explorer! 🎉

## Usage

1. **Right-click** on any file or folder in the VS Code explorer.
2. **Select** one of the options from the **Clipster** menu.

### Creating Files or Folders from Clipboard

To create one or multiple files or folders from clipboard content:

1. **Copy** the paths of the files or folders you wish to create to your clipboard. Each path should be on a new line for multiple items.
2. **Right-click** on the directory in the VS Code explorer where you want to create the new files or folders.
3. **Select** **📋 Create File or Folder from Clipboard** from the **Clipster** menu.
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

- **Copy File**: Right-click a file and select **📄 Copy File** to store its path in the clipboard.
- **Paste File**: Right-click a folder and select **📄 Paste File** to paste the copied file into the selected folder.
- **Copy File Contents**: Right-click a file and select **📄 Copy File Contents** to copy only the content of the file (without its path) to the clipboard.

## Example

Here is an example of a copied folder structure:

```
📦 clipster
🖥️ c:\projects\clipster
┣ 📂 src
┃ ┣ 📂 utils
┃ ┃ ┗ 📄 helper.js
┃ ┗ 📄 main.js
┣ 📂 assets
┃ ┗ 📄 logo.png
┗ 📄 README.md
```

This feature helps you easily share the structure of your projects with others, humans or androids!

## Settings

You can customize Clipster's behavior through the following settings in the VS Code settings:

⚙️ **To access settings**: Go to **File > Preferences > Settings** (Windows/Linux) or **Code > Preferences > Settings** (macOS), then search for "Clipster".

- **Clipster: Show Create File from Clipboard** (`clipster.showCreateFileFromClipboard`): Enable or disable creating files or folders from clipboard content.
- **Clipster: Show Copy Folder Structure** (`clipster.showCopyFolderStructure`): Enable or disable copying the folder structure.
- **Clipster: Show Copy Folder Structure and Content** (`clipster.showCopyFolderStructureAndContent`): Enable or disable copying the folder structure along with content.
- **Clipster: Show Copy File Content with Path** (`clipster.showCopyFileContentWithHeader`): Enable or disable copying file content with the path.
- **Clipster: Show Copy Root Folder Path** (`clipster.showCopyRootFolderPath`): Enable or disable copying the root folder path.
- **Clipster: Show Copy Root Folder Structure** (`clipster.showCopyRootFolderStructure`): Enable or disable copying the root folder structure.
- **Clipster: Show Copy Root Folder Structure and Content** (`clipster.showCopyRootFolderStructureAndContent`): Enable or disable copying the root folder structure along with content.
- **Clipster: Max Root Files** (`clipster.maxRootFiles`): Sets the maximum number of files that can be copied from the root folder (default: 10).
- **Clipster: Max Root Size KB** (`clipster.maxRootSizeKB`): Sets the maximum total size (in KB) for copied root files (default: 500KB).
- **Clipster: Show in Clipster Submenu** (`clipster.showInClipsterSubmenu`): Show Clipster commands in a submenu or directly in the root menu.
- **Clipster: Additional Ignores** (`clipster.additionalIgnores`): Add custom file patterns to ignore when copying folder structures.

## Ignoring Files

Clipster respects `.gitignore` and `.vscodeignore` files when copying folder structures. You can also add custom ignore patterns using the **Clipster: Additional Ignores** setting to tailor the output to your needs.

## Installation

[GitHub Repository](https://github.com/TheJesper/clipster)

Search for Clipster in VS Code to install.

Run `npm run clean-build-install` to build and install the extension locally.

### Scripts Explained

- **test**: Runs the Mocha tests.
- **webpack**: Builds the project in development mode.
- **build**: Creates a production build using Webpack.
- **clean**: Removes the `OUT` directory.
- **bump-build**: Updates the version and builds the extension.
- **clean-build-install**: Cleans, builds, and installs the extension.
- **install-extension**: Installs the extension from the build output.
- **release**: Creates a new release version.

**Note**: The tests are currently not passing.

## License

This project is licensed under the MIT License.

**Disclaimer**: Please provide feedback to help us improve 🤙 Ps. Might contain traces of AI-produced code 😁
