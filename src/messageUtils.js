// File: messageUtils.js

import * as vscode from "vscode";

// Function to show an error message
export const showErrorMessage = (message) => {
  vscode.window.showErrorMessage(message);
};

// Function to show an information message
export const showInformationMessage = (message) => {
  vscode.window.showInformationMessage(message);
};
