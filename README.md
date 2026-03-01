# Clipster

A minimal VS Code extension to copy file paths, folder structures, and file contents from the Explorer to the clipboard — perfect for sharing context with ChatGPT, Gemini, Perplexity, or other humans.

## Features

- **Copy Folder Structure** — tree view of any folder, with or without file contents
- **Copy File Content** — with path header, line numbers, or VS Code diagnostics
- **Copy Multiple Files** — concatenate selected files into one clipboard entry
- **Copy Root Folder** — structure and content of the entire workspace
- **Copy Selection with Context** — highlighted code with file path and line range
- **Create Files from Clipboard** — scaffold files/folders from paths in your clipboard
- **Copy / Paste Files** — move files between folders like a file manager

All commands appear in the **Clipster** submenu of the Explorer context menu.

## Documentation

| Doc                                    | Contents                                                |
| -------------------------------------- | ------------------------------------------------------- |
| [Usage Guide](docs/usage.md)           | All commands explained with examples                    |
| [Settings Reference](docs/settings.md) | Visibility toggles, ignore patterns, root folder limits |
| [CLI Reference](docs/cli.md)           | Install globally, commands, flags, pipe examples        |

## Quick Start

1. Right-click any file or folder in the VS Code Explorer.
2. Choose **Clipster** → pick a command.

To use the CLI:

```bash
npm install -g .           # install once
clipster structure src/ | clip    # Windows — pipe to clipboard
clipster structure src/ | pbcopy  # macOS
```

## Installation

Search for **Clipster** in the VS Code Extensions panel, or install locally:

```bash
npm run clean-build-install
```

[GitHub Repository](https://github.com/TheJesper/clipster)

## License

MIT
