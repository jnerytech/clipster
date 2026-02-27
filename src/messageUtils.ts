// src/messageUtils.ts
import * as vscode from "vscode";

export const showErrorMessage = (message: string): void => {
  vscode.window.showErrorMessage(message);
};

export const showInformationMessage = (message: string): void => {
  vscode.window.showInformationMessage(message);
};

export const showWarningMessage = (message: string): void => {
  vscode.window.showWarningMessage(message);
};
