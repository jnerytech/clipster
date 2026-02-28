import * as vscode from "vscode";
import { activate, deactivate } from "../extension";

jest.mock("../fileHelpers", () => ({
  getFolderStructure: jest.fn(() => "structure"),
  getFolderStructureAndContent: jest.fn(() => "content"),
  copyRootFolderPath: jest.fn(() => "/mock/workspace"),
  copyRootFolderStructure: jest.fn(() => "root structure"),
  copyRootFolderStructureAndContent: jest.fn(() => "root content"),
  copyFileContentWithPath: jest.fn(() => Promise.resolve()),
  createFileOrFolderFromClipboard: jest.fn(() => Promise.resolve()),
}));

jest.mock("../clipboardHelper", () => ({
  copyToClipboard: jest.fn(() => Promise.resolve()),
}));

jest.mock("../fileUtils", () => ({
  copyFileToClipboard: jest.fn(() => Promise.resolve()),
  pasteFileFromClipboard: jest.fn(() => Promise.resolve()),
  isFile: jest.fn(() => false),
}));

describe("extension", () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;

    // onDidChangeConfiguration returns a disposable-like object
    (vscode.workspace.onDidChangeConfiguration as jest.Mock).mockReturnValue({
      dispose: jest.fn(),
    });

    // registerCommand returns a disposable-like object
    (vscode.commands.registerCommand as jest.Mock).mockReturnValue({
      dispose: jest.fn(),
    });
  });

  describe("activate", () => {
    it("registers all enabled commands on activation", () => {
      activate(mockContext);
      expect(vscode.commands.registerCommand).toHaveBeenCalled();
    });

    it("pushes disposables onto context.subscriptions", () => {
      activate(mockContext);
      expect((mockContext.subscriptions as { dispose(): void }[]).length).toBeGreaterThan(0);
    });

    it("re-registers commands when clipster configuration changes", () => {
      activate(mockContext);

      const firstCallCount = (vscode.commands.registerCommand as jest.Mock).mock.calls.length;

      // Retrieve the onDidChangeConfiguration callback and invoke it
      const configCallback = (vscode.workspace.onDidChangeConfiguration as jest.Mock).mock
        .calls[0][0] as (e: { affectsConfiguration: (s: string) => boolean }) => void;

      configCallback({
        affectsConfiguration: (key: string) => key === "clipster",
      });

      expect((vscode.commands.registerCommand as jest.Mock).mock.calls.length).toBeGreaterThan(
        firstCallCount
      );
    });

    it("does not re-register when an unrelated configuration changes", () => {
      activate(mockContext);

      const firstCallCount = (vscode.commands.registerCommand as jest.Mock).mock.calls.length;

      const configCallback = (vscode.workspace.onDidChangeConfiguration as jest.Mock).mock
        .calls[0][0] as (e: { affectsConfiguration: (s: string) => boolean }) => void;

      configCallback({ affectsConfiguration: () => false });

      expect((vscode.commands.registerCommand as jest.Mock).mock.calls.length).toBe(firstCallCount);
    });
  });

  describe("deactivate", () => {
    it("can be called after activate without throwing", () => {
      activate(mockContext);
      expect(() => deactivate()).not.toThrow();
    });

    it("can be called without a prior activate without throwing", () => {
      expect(() => deactivate()).not.toThrow();
    });
  });

  describe("command handlers", () => {
    it("copyFolderStructure handler copies folder structure", async () => {
      activate(mockContext);

      const { copyToClipboard } = jest.requireMock("../clipboardHelper") as {
        copyToClipboard: jest.Mock;
      };
      const { isFile } = jest.requireMock("../fileUtils") as {
        isFile: jest.Mock;
      };
      isFile.mockReturnValue(false);

      // Find the copyFolderStructure command handler
      const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls as [
        string,
        (...args: unknown[]) => unknown,
      ][];
      const entry = calls.find(([cmd]) => cmd === "clipster.copyFolderStructure");
      expect(entry).toBeDefined();

      if (entry) {
        await entry[1]({ fsPath: "/mock/workspace" });
        expect(copyToClipboard).toHaveBeenCalled();
      }
    });

    it("copyRootFolderPath handler copies root folder path", async () => {
      activate(mockContext);

      const { copyToClipboard } = jest.requireMock("../clipboardHelper") as {
        copyToClipboard: jest.Mock;
      };

      const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls as [
        string,
        (...args: unknown[]) => unknown,
      ][];
      const entry = calls.find(([cmd]) => cmd === "clipster.copyRootFolderPath");
      expect(entry).toBeDefined();

      if (entry) {
        await entry[1]();
        expect(copyToClipboard).toHaveBeenCalled();
      }
    });

    it("copyRootFolderStructure handler copies root folder structure", async () => {
      activate(mockContext);

      const { copyToClipboard } = jest.requireMock("../clipboardHelper") as {
        copyToClipboard: jest.Mock;
      };

      const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls as [
        string,
        (...args: unknown[]) => unknown,
      ][];
      const entry = calls.find(([cmd]) => cmd === "clipster.copyRootFolderStructure");
      expect(entry).toBeDefined();

      if (entry) {
        await entry[1]();
        expect(copyToClipboard).toHaveBeenCalled();
      }
    });

    it("copyRootFolderStructureAndContent handler copies content", async () => {
      activate(mockContext);

      const { copyToClipboard } = jest.requireMock("../clipboardHelper") as {
        copyToClipboard: jest.Mock;
      };

      const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls as [
        string,
        (...args: unknown[]) => unknown,
      ][];
      const entry = calls.find(([cmd]) => cmd === "clipster.copyRootFolderStructureAndContent");
      expect(entry).toBeDefined();

      if (entry) {
        await entry[1]();
        expect(copyToClipboard).toHaveBeenCalled();
      }
    });

    it("copyFolderStructureAndContent handler copies folder structure and content", async () => {
      activate(mockContext);

      const { copyToClipboard } = jest.requireMock("../clipboardHelper") as {
        copyToClipboard: jest.Mock;
      };
      const { isFile } = jest.requireMock("../fileUtils") as {
        isFile: jest.Mock;
      };
      isFile.mockReturnValue(false);

      const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls as [
        string,
        (...args: unknown[]) => unknown,
      ][];
      const entry = calls.find(([cmd]) => cmd === "clipster.copyFolderStructureAndContent");
      expect(entry).toBeDefined();

      if (entry) {
        await entry[1]({ fsPath: "/mock/workspace" });
        expect(copyToClipboard).toHaveBeenCalled();
      }
    });

    it("copyFolderStructureAndContent falls back to workspace root when no URI", async () => {
      activate(mockContext);

      const { copyToClipboard } = jest.requireMock("../clipboardHelper") as {
        copyToClipboard: jest.Mock;
      };

      const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls as [
        string,
        (...args: unknown[]) => unknown,
      ][];
      const entry = calls.find(([cmd]) => cmd === "clipster.copyFolderStructureAndContent");
      expect(entry).toBeDefined();

      if (entry) {
        // No URI passed — should fall back to workspace root
        await entry[1](null);
        expect(copyToClipboard).toHaveBeenCalled();
      }
    });

    it("createFileFromClipboard handler creates files from clipboard", async () => {
      (vscode.env.clipboard.readText as jest.Mock).mockResolvedValue("newfile.ts");
      activate(mockContext);

      const { createFileOrFolderFromClipboard } = jest.requireMock("../fileHelpers") as {
        createFileOrFolderFromClipboard: jest.Mock;
      };

      const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls as [
        string,
        (...args: unknown[]) => unknown,
      ][];
      const entry = calls.find(([cmd]) => cmd === "clipster.createFileFromClipboard");
      expect(entry).toBeDefined();

      if (entry) {
        await entry[1]({ fsPath: "/mock/workspace" });
        expect(createFileOrFolderFromClipboard).toHaveBeenCalled();
      }
    });

    it("createFileFromClipboard handler shows error for empty clipboard", async () => {
      (vscode.env.clipboard.readText as jest.Mock).mockResolvedValue("  \n  ");
      activate(mockContext);

      const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls as [
        string,
        (...args: unknown[]) => unknown,
      ][];
      const entry = calls.find(([cmd]) => cmd === "clipster.createFileFromClipboard");
      expect(entry).toBeDefined();

      if (entry) {
        await entry[1]({ fsPath: "/mock/workspace" });
        expect(vscode.window.showErrorMessage).toHaveBeenCalled();
      }
    });

    it("copyFileContentWithHeader handler copies file content", async () => {
      activate(mockContext);

      const { copyFileContentWithPath } = jest.requireMock("../fileHelpers") as {
        copyFileContentWithPath: jest.Mock;
      };

      const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls as [
        string,
        (...args: unknown[]) => unknown,
      ][];
      const entry = calls.find(([cmd]) => cmd === "clipster.copyFileContentWithHeader");
      expect(entry).toBeDefined();

      if (entry) {
        const uri = { fsPath: "/mock/workspace/file.ts" } as vscode.Uri;
        await entry[1](uri, [uri]);
        expect(copyFileContentWithPath).toHaveBeenCalled();
      }
    });

    it("copyFile handler copies a file to the clipboard", async () => {
      activate(mockContext);

      const { copyFileToClipboard } = jest.requireMock("../fileUtils") as {
        copyFileToClipboard: jest.Mock;
      };

      const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls as [
        string,
        (...args: unknown[]) => unknown,
      ][];
      const entry = calls.find(([cmd]) => cmd === "clipster.copyFile");
      expect(entry).toBeDefined();

      if (entry) {
        const uri = { fsPath: "/mock/workspace/file.ts" } as vscode.Uri;
        await entry[1](uri);
        expect(copyFileToClipboard).toHaveBeenCalledWith(uri);
      }
    });

    it("pasteFile handler pastes a file from the clipboard", async () => {
      activate(mockContext);

      const { pasteFileFromClipboard } = jest.requireMock("../fileUtils") as {
        pasteFileFromClipboard: jest.Mock;
      };

      const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls as [
        string,
        (...args: unknown[]) => unknown,
      ][];
      const entry = calls.find(([cmd]) => cmd === "clipster.pasteFile");
      expect(entry).toBeDefined();

      if (entry) {
        const uri = { fsPath: "/mock/workspace" } as vscode.Uri;
        await entry[1](uri);
        expect(pasteFileFromClipboard).toHaveBeenCalledWith(uri);
      }
    });

    it("copyRootFolderPath shows error when root path is empty", async () => {
      const { copyRootFolderPath } = jest.requireMock("../fileHelpers") as {
        copyRootFolderPath: jest.Mock;
      };
      copyRootFolderPath.mockReturnValue("   ");

      activate(mockContext);

      const calls = (vscode.commands.registerCommand as jest.Mock).mock.calls as [
        string,
        (...args: unknown[]) => unknown,
      ][];
      const entry = calls.find(([cmd]) => cmd === "clipster.copyRootFolderPath");
      expect(entry).toBeDefined();

      if (entry) {
        await entry[1]();
        expect(vscode.window.showErrorMessage).toHaveBeenCalled();
      }
    });
  });
});
