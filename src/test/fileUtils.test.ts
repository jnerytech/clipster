import fs from "fs";
import * as vscode from "vscode";
import { isFile, readFileContent, copyFileToClipboard, pasteFileFromClipboard } from "../fileUtils";

jest.mock("fs");

const mockFs = jest.mocked(fs);

describe("fileUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (vscode.env.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);
    (vscode.env.clipboard.readText as jest.Mock).mockResolvedValue("");
  });

  describe("isFile", () => {
    it("returns true when path points to a file", () => {
      mockFs.statSync.mockReturnValue({
        isFile: () => true,
      } as unknown as fs.Stats);
      expect(isFile("/some/file.ts")).toBe(true);
    });

    it("returns false when path points to a directory", () => {
      mockFs.statSync.mockReturnValue({
        isFile: () => false,
      } as unknown as fs.Stats);
      expect(isFile("/some/dir")).toBe(false);
    });

    it("returns false when statSync throws", () => {
      mockFs.statSync.mockImplementation(() => {
        throw new Error("ENOENT");
      });
      expect(isFile("/nonexistent")).toBe(false);
    });
  });

  describe("readFileContent", () => {
    it("returns the file content as a string", () => {
      (mockFs.readFileSync as jest.Mock).mockReturnValue("file content here");
      const content = readFileContent("/path/to/file.ts");
      expect(content).toBe("file content here");
    });

    it("returns empty string and shows error when read fails", () => {
      (mockFs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("ENOENT");
      });
      const content = readFileContent("/bad/path.ts");
      expect(content).toBe("");
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });

  describe("copyFileToClipboard", () => {
    it("writes the file path to the clipboard", async () => {
      const uri = { fsPath: "/workspace/src/index.ts" } as vscode.Uri;
      await copyFileToClipboard(uri);
      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith("/workspace/src/index.ts");
    });

    it("shows information message with the file basename", async () => {
      const uri = { fsPath: "/workspace/src/index.ts" } as vscode.Uri;
      await copyFileToClipboard(uri);
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith("File copied: index.ts");
    });

    it("shows error message when clipboard write fails", async () => {
      (vscode.env.clipboard.writeText as jest.Mock).mockRejectedValue(new Error("clipboard error"));
      const uri = { fsPath: "/workspace/src/index.ts" } as vscode.Uri;
      await copyFileToClipboard(uri);
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });

  describe("pasteFileFromClipboard", () => {
    it("shows error when clipboard content is not a valid file path", async () => {
      (vscode.env.clipboard.readText as jest.Mock).mockResolvedValue("/nonexistent/path.ts");
      mockFs.existsSync.mockReturnValue(false);
      const targetUri = { fsPath: "/mock/workspace/dest" } as vscode.Uri;
      await pasteFileFromClipboard(targetUri);
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    // VULN-3 fix: source path must be within the workspace
    it("blocks paste when source is outside the workspace", async () => {
      const src = "/outside/workspace/secret.ts";
      (vscode.env.clipboard.readText as jest.Mock).mockResolvedValue(src);
      mockFs.existsSync.mockReturnValue(true); // source "exists"
      const targetUri = { fsPath: "/mock/workspace/dest" } as vscode.Uri;
      await pasteFileFromClipboard(targetUri);
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
      expect(mockFs.copyFileSync).not.toHaveBeenCalled();
    });

    it("copies the file to the target directory", async () => {
      // VULN-3 fix: source must be within /mock/workspace (default mock workspace)
      const src = "/mock/workspace/src/file.ts";
      const dest = "/mock/workspace/dest";
      (vscode.env.clipboard.readText as jest.Mock).mockResolvedValue(src);
      mockFs.existsSync.mockImplementation((p) => {
        // source exists; destination does not yet
        return String(p) === src;
      });
      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        isDirectory: () => false,
      } as unknown as fs.Stats);
      mockFs.copyFileSync.mockReturnValue(undefined);
      const targetUri = { fsPath: dest } as vscode.Uri;
      await pasteFileFromClipboard(targetUri);
      expect(mockFs.copyFileSync).toHaveBeenCalledWith(src, `${dest}/file.ts`);
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith("File pasted: file.ts");
    });

    it("shows warning when destination file already exists", async () => {
      // VULN-3 fix: source must be within /mock/workspace
      const src = "/mock/workspace/src/file.ts";
      const dest = "/mock/workspace/dest";
      (vscode.env.clipboard.readText as jest.Mock).mockResolvedValue(src);
      mockFs.existsSync.mockReturnValue(true); // both source and dest "exist"
      const targetUri = { fsPath: dest } as vscode.Uri;
      await pasteFileFromClipboard(targetUri);
      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
    });

    it("shows error when clipboard read throws", async () => {
      (vscode.env.clipboard.readText as jest.Mock).mockRejectedValue(new Error("clipboard error"));
      const targetUri = { fsPath: "/mock/workspace/dest" } as vscode.Uri;
      await pasteFileFromClipboard(targetUri);
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    // BUG-7 fix: pasting a folder should copy the entire directory tree
    it("copies a directory to the target when source is a folder", async () => {
      const src = "/mock/workspace/src/myFolder";
      const dest = "/mock/workspace/dest";
      (vscode.env.clipboard.readText as jest.Mock).mockResolvedValue(src);
      mockFs.existsSync.mockImplementation((p) => String(p) === src);
      mockFs.statSync.mockReturnValue({
        isFile: () => false,
        isDirectory: () => true,
      } as unknown as fs.Stats);
      (mockFs.readdirSync as jest.Mock).mockReturnValue([]);
      mockFs.mkdirSync.mockReturnValue(undefined);
      const targetUri = { fsPath: dest } as vscode.Uri;
      await pasteFileFromClipboard(targetUri);
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(`${dest}/myFolder`, { recursive: true });
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith("Folder pasted: myFolder");
    });
  });
});
