// src/test/__mocks__/vscode.ts
const vscode = {
  window: {
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
    })),
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showTextDocument: jest.fn(),
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: "/mock/workspace" } }] as { uri: { fsPath: string } }[],
    getConfiguration: jest.fn(() => ({
      get: jest.fn((_key: string, defaultValue: unknown) => defaultValue),
    })),
    openTextDocument: jest.fn(),
    onDidChangeConfiguration: jest.fn(),
  },
  env: {
    clipboard: {
      readText: jest.fn(() => Promise.resolve("")),
      writeText: jest.fn(() => Promise.resolve()),
    },
  },
  commands: {
    registerCommand: jest.fn(),
  },
  languages: {
    getDiagnostics: jest.fn(() => []),
  },
  Disposable: jest.fn(),
  Uri: {
    file: jest.fn((p: string) => ({ fsPath: p })),
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },
};

export = vscode;
