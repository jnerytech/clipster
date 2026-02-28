import * as vscode from "vscode";
import {
  showErrorMessage,
  showInformationMessage,
  showWarningMessage,
} from "../messageUtils";

describe("messageUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("showErrorMessage", () => {
    it("calls vscode.window.showErrorMessage with the given message", () => {
      showErrorMessage("Something went wrong");
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        "Something went wrong"
      );
    });

    it("forwards different messages correctly", () => {
      showErrorMessage("Another error");
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        "Another error"
      );
    });
  });

  describe("showInformationMessage", () => {
    it("calls vscode.window.showInformationMessage with the given message", () => {
      showInformationMessage("Operation completed");
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "Operation completed"
      );
    });
  });

  describe("showWarningMessage", () => {
    it("calls vscode.window.showWarningMessage with the given message", () => {
      showWarningMessage("Proceeding with caution");
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        "Proceeding with caution"
      );
    });
  });
});
