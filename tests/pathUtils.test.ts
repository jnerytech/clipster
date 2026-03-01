import fs from "fs";
import path from "path";
import { normalizeClipboardContent, getBaseDirectory, resolveTargetPath } from "../src/pathUtils";
import { initPlatform, Platform } from "../src/platform";

jest.mock("fs");

const mockFs = jest.mocked(fs);

const mockPlatform = {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
    readText: jest.fn(() => Promise.resolve("")),
  },
  message: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  getConfig: jest.fn((_key: string, defaultValue: unknown) => defaultValue),
  getWorkspaceRoot: jest.fn<string | null, []>(() => "/mock/workspace"),
  getDiagnostics: jest.fn(() => []),
};

describe("pathUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    initPlatform(mockPlatform as unknown as Platform);
    mockPlatform.getWorkspaceRoot.mockReturnValue("/mock/workspace");
    // resolveTargetPath uses realpathSync to compare real paths; behave as identity in tests
    (mockFs.realpathSync as unknown as jest.Mock).mockImplementation((p: string) => p);
  });

  describe("normalizeClipboardContent", () => {
    it("replaces forward slashes with path separator", () => {
      const input = "src/components/App";
      const result = normalizeClipboardContent(input);
      expect(result).toBe(["src", "components", "App"].join(path.sep));
    });

    it("replaces backslashes with path separator", () => {
      const input = "src\\components\\App";
      const result = normalizeClipboardContent(input);
      expect(result).toBe(["src", "components", "App"].join(path.sep));
    });

    it("collapses multiple consecutive separators", () => {
      const result = normalizeClipboardContent("a//b///c");
      expect(result).toBe(["a", "b", "c"].join(path.sep));
    });

    it("returns plain filename unchanged (no slashes)", () => {
      const result = normalizeClipboardContent("file.ts");
      expect(result).toBe("file.ts");
    });
  });

  describe("getBaseDirectory", () => {
    it("returns parent directory when the path is a file", () => {
      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        isDirectory: () => false,
      } as unknown as fs.Stats);
      expect(getBaseDirectory("/some/dir/file.ts")).toBe("/some/dir");
    });

    it("returns the path itself when it is a directory", () => {
      mockFs.statSync.mockReturnValue({
        isFile: () => false,
        isDirectory: () => true,
      } as unknown as fs.Stats);
      expect(getBaseDirectory("/some/dir")).toBe("/some/dir");
    });

    it("returns null and shows error when stat throws", () => {
      mockFs.statSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      const result = getBaseDirectory("/nonexistent");
      expect(result).toBeNull();
      expect(mockPlatform.message.error).toHaveBeenCalled();
    });
  });

  describe("resolveTargetPath", () => {
    // VULN-1 fix: absolute paths outside the workspace must be blocked
    it("blocks absolute paths that escape the workspace", () => {
      const result = resolveTargetPath("/absolute/path/file.ts", "/base/dir");
      expect(result).toBeNull();
      expect(mockPlatform.message.error).toHaveBeenCalled();
    });

    it("allows absolute paths within the workspace", () => {
      const result = resolveTargetPath("/mock/workspace/src/file.ts", "/base/dir");
      expect(result).toBe(path.normalize("/mock/workspace/src/file.ts"));
    });

    it("resolves a path containing separator from workspace root", () => {
      const result = resolveTargetPath("src/file.ts", "/base/dir");
      expect(result).toBe(path.normalize("/mock/workspace/src/file.ts"));
    });

    it("resolves a bare filename from baseDir within the workspace", () => {
      // baseDir must be inside the workspace; in real usage this comes from
      // getBaseDirectory() which always returns a workspace path.
      const result = resolveTargetPath("file.ts", "/mock/workspace/src");
      expect(result).toBe(path.normalize("/mock/workspace/src/file.ts"));
    });

    it("returns null when no workspace and path contains separator", () => {
      mockPlatform.getWorkspaceRoot.mockReturnValue(null);
      const result = resolveTargetPath("src/file.ts", "/base/dir");
      expect(result).toBeNull();
    });

    it("resolves backslash-separated path from workspace root", () => {
      const result = resolveTargetPath("src\\file.ts", "/base/dir");
      expect(result).toBe(path.normalize("/mock/workspace/src\\file.ts"));
    });

    // VULN-1 fix: path traversal via relative sequences must be blocked
    it("blocks path traversal via relative separator path", () => {
      const result = resolveTargetPath("../../etc/passwd", "/base/dir");
      expect(result).toBeNull();
      expect(mockPlatform.message.error).toHaveBeenCalled();
    });
  });
});
