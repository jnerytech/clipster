# Clipster – CLI Reference

Clipster's core commands are available as a standalone Node.js CLI. All output goes to **stdout** so you can pipe it to your clipboard tool or redirect it to a file.

---

## Installation

### Global (recommended)

```bash
cd /path/to/clipster
npm install -g .
```

This runs `build:cli` automatically via the `prepack` hook, then links the `clipster` binary into your global npm bin directory. After this, `clipster` works from any directory.

### Local (no install)

```bash
npm run build:cli          # compiles to dist/src/cli.js
node dist/src/cli.js --help
```

---

## Commands

```
clipster [options] [command]

Commands:
  structure <dir>            Folder structure tree (no file contents)
  content <dir>              Folder structure + all file contents
  file [options] <files...>  File(s) content with path header
  folder [options] <dir>     All files in folder, recursively
  multi <files...>           Multiple files concatenated with separators
  help [command]             Display help for a command
```

### `structure <dir>`

Outputs the folder tree — same format as **Copy Folder Structure** in VS Code.

```bash
clipster structure src/
```

### `content <dir>`

Outputs the folder tree plus the content of every file.

```bash
clipster content src/
```

### `file [options] <files...>`

Outputs one or more files with a path header.

| Flag             | Short | Description                                     |
| ---------------- | ----- | ----------------------------------------------- |
| `--line-numbers` | `-n`  | Prefix each line with its line number           |
| `--diagnostics`  | `-d`  | Append diagnostics block (always "none" in CLI) |

```bash
clipster file src/extension.ts
clipster file -n src/extension.ts src/platform.ts
clipster file --diagnostics src/extension.ts
```

### `folder [options] <dir>`

Outputs all files in a directory recursively.

| Flag             | Short | Description                                               |
| ---------------- | ----- | --------------------------------------------------------- |
| `--line-numbers` | `-n`  | Prefix each line with its line number (default behaviour) |
| `--diagnostics`  | `-d`  | Append diagnostics block per file (always "none" in CLI)  |

```bash
clipster folder src/
clipster folder -d src/
```

### `multi <files...>`

Concatenates multiple files into a single output with separators between them.

```bash
clipster multi src/platform.ts src/fileHelpers.ts src/cli.ts
```

---

## Pipe to clipboard

```bash
# Windows
clipster structure src/ | clip

# macOS
clipster content src/ | pbcopy

# Linux
clipster file src/extension.ts | xclip -selection clipboard
```

If running without a global install, replace `clipster` with `node dist/src/cli.js`.

---

## Notes

- **Diagnostics in CLI**: Always reported as "none" — diagnostics require a running VS Code instance with language servers active.
- **Ignore patterns**: The same `defaultIgnores` / `additionalIgnores` / `.gitignore` logic applies in CLI mode.
- **Version**: `clipster -V` prints the current version.
- **Help**: `clipster --help` or `clipster help <command>` for per-command help.
