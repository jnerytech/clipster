import fs from "fs";
import { filterIgnoredFiles } from "../src/ignoreHelper";

jest.mock("fs");

const mockFs = jest.mocked(fs);

describe("ignoreHelper – filterIgnoredFiles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no .gitignore, entries are plain files (not dirs)
    mockFs.existsSync.mockReturnValue(false);
    mockFs.statSync.mockReturnValue({
      isDirectory: () => false,
      isFile: () => true,
    } as unknown as fs.Stats);
  });

  it("passes all files when there are no ignore patterns", () => {
    const files = ["a.ts", "b.ts", "c.ts"];
    const result = filterIgnoredFiles("/workspace", files, "/workspace");
    expect(result).toEqual(files);
  });

  it("filters files matching additionalIgnores patterns", () => {
    const files = ["index.ts", "app.log", "debug.log"];
    const result = filterIgnoredFiles("/workspace", files, "/workspace", ["*.log"]);
    expect(result).toEqual(["index.ts"]);
  });

  it("reads and applies .gitignore patterns", () => {
    mockFs.existsSync.mockReturnValue(true);
    (mockFs.readFileSync as jest.Mock).mockReturnValue("dist\n*.log\n");
    const files = ["src", "dist", "app.log", "index.ts"];
    mockFs.statSync.mockImplementation(((p: fs.PathLike) => ({
      isDirectory: () => String(p).endsWith("dist"),
      isFile: () => !String(p).endsWith("dist"),
    })) as unknown as typeof fs.statSync);

    const result = filterIgnoredFiles("/workspace", files, "/workspace");
    expect(result).not.toContain("app.log");
    expect(result).toContain("src");
    expect(result).toContain("index.ts");
  });

  it("returns empty array when files argument is not an array", () => {
    const result = filterIgnoredFiles("/dir", null as unknown as string[], "/workspace");
    expect(result).toEqual([]);
  });

  it("returns empty array when dir is invalid", () => {
    const result = filterIgnoredFiles(null as unknown as string, ["file.ts"], "/workspace");
    expect(result).toEqual([]);
  });

  it("handles .gitignore read failure gracefully", () => {
    mockFs.existsSync.mockReturnValue(true);
    (mockFs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error("Permission denied");
    });
    const files = ["file.ts"];
    const result = filterIgnoredFiles("/workspace", files, "/workspace");
    expect(result).toEqual(files);
  });

  it("falls back to dir as root when workspaceRoot is empty string", () => {
    const files = ["file.ts"];
    const result = filterIgnoredFiles("/workspace", files, "");
    expect(result).toEqual(files);
  });

  it("filters directories correctly when entry is a directory", () => {
    // node_modules/ pattern should match directories named node_modules
    mockFs.statSync.mockImplementation(((p: fs.PathLike) => ({
      isDirectory: () => String(p).endsWith("node_modules"),
      isFile: () => !String(p).endsWith("node_modules"),
    })) as unknown as typeof fs.statSync);

    const files = ["node_modules", "src", "index.ts"];
    const result = filterIgnoredFiles("/workspace", files, "/workspace", ["node_modules/"]);
    expect(result).not.toContain("node_modules");
    expect(result).toContain("src");
    expect(result).toContain("index.ts");
  });

  it("skips non-string entries silently", () => {
    const files = ["file.ts", null as unknown as string, "other.ts"];
    const result = filterIgnoredFiles("/workspace", files, "/workspace");
    expect(result).toEqual(["file.ts", "other.ts"]);
  });

  it("applies default ignore patterns even without a .gitignore", () => {
    // No .gitignore present
    mockFs.existsSync.mockReturnValue(false);
    mockFs.statSync.mockImplementation(((p: fs.PathLike) => ({
      isDirectory: () => String(p).includes("node_modules") || String(p).includes("dist"),
      isFile: () => !String(p).includes("node_modules") && !String(p).includes("dist"),
    })) as unknown as typeof fs.statSync);

    const defaultIgnores = ["node_modules/", "dist/", "*.log"];
    const files = ["src", "node_modules", "dist", "app.log", "index.ts"];
    const result = filterIgnoredFiles("/workspace", files, "/workspace", defaultIgnores);

    expect(result).not.toContain("node_modules");
    expect(result).not.toContain("dist");
    expect(result).not.toContain("app.log");
    expect(result).toContain("src");
    expect(result).toContain("index.ts");
  });
});
