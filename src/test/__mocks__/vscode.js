// /src/test/__mocks__/vscode.js
module.exports = {
  window: {
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
    })),
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: "/mock/workspace" } }],
  },
};
