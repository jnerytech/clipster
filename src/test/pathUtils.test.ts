import fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { normalizeClipboardContent, getBaseDirectory, resolveTargetPath } from "../pathUtils";

jest.mock("fs");

const mockFs = jest.mocked(fs);

describe("pathUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // restore default workspace mock
    (
      vscode.workspace as unknown as { workspaceFolders: { uri: { fsPath: string } }[] }
    ).workspaceFolders = [{ uri: { fsPath: "/mock/workspace" } }];
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
      const uri = { fsPath: "/some/dir/file.ts" } as vscode.Uri;
      expect(getBaseDirectory(uri)).toBe("/some/dir");
    });

    it("returns the path itself when it is a directory", () => {
      mockFs.statSync.mockReturnValue({
        isFile: () => false,
        isDirectory: () => true,
      } as unknown as fs.Stats);
      const uri = { fsPath: "/some/dir" } as vscode.Uri;
      expect(getBaseDirectory(uri)).toBe("/some/dir");
    });

    it("returns null and shows error when stat throws", () => {
      mockFs.statSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      const uri = { fsPath: "/nonexistent" } as vscode.Uri;
      const result = getBaseDirectory(uri);
      expect(result).toBeNull();
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });

  describe("resolveTargetPath", () => {
    // VULN-1 fix: absolute paths outside the workspace must be blocked
    it("blocks absolute paths that escape the workspace", () => {
      const result = resolveTargetPath("/absolute/path/file.ts", "/base/dir");
      expect(result).toBeNull();
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
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
      (
        vscode.workspace as unknown as {
          workspaceFolders: { uri: { fsPath: string } }[] | null;
        }
      ).workspaceFolders = null;
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
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });
});
