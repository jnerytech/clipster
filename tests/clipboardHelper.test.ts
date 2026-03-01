import * as vscode from "vscode";
import { copyToClipboard } from "../src/clipboardHelper";

describe("clipboardHelper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (vscode.env.clipboard.writeText as jest.Mock).mockResolvedValue(undefined);
  });

  describe("copyToClipboard", () => {
    it("writes text to clipboard", async () => {
      await copyToClipboard("hello world", "Done!");
      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith("hello world");
    });

    it("shows provided success message on success", async () => {
      await copyToClipboard("content", "Success message");
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith("Success message");
    });

    it("uses default success message when none provided", async () => {
      await copyToClipboard("content");
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith("Copied to clipboard.");
    });

    it("shows custom error message on clipboard write failure", async () => {
      (vscode.env.clipboard.writeText as jest.Mock).mockRejectedValue(
        new Error("Clipboard unavailable")
      );
      await copyToClipboard("text", "ok", "Custom error message");
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("Custom error message");
    });

    it("shows default error message when not provided on failure", async () => {
      (vscode.env.clipboard.writeText as jest.Mock).mockRejectedValue(new Error("fail"));
      await copyToClipboard("text");
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("Failed to copy to clipboard.");
    });

    it("handles text longer than 50 characters without throwing", async () => {
      const longText = "a".repeat(100);
      await copyToClipboard(longText, "Done");
      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith(longText);
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith("Done");
    });

    it("handles empty string", async () => {
      await copyToClipboard("", "Empty copied");
      expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith("");
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith("Empty copied");
    });
  });
});
