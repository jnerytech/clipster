// src/test/logger.test.ts
// logger.ts detects the test environment via JEST_WORKER_ID and falls back
// to console — no vscode mock is needed for this test suite.
import logger from "../src/logger";

describe("Logger Module", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  test("logs messages with default module name", () => {
    logger.log("Test message");
    expect(consoleLogSpy).toHaveBeenCalledWith("[INFO] [General] Test message");
  });

  test("logs messages with a specific module name", () => {
    logger.log("Test message", "TestModule");
    expect(consoleLogSpy).toHaveBeenCalledWith("[INFO] [TestModule] Test message");
  });

  test("logs warn messages", () => {
    logger.warn("Test warning", "WarnModule");
    expect(consoleWarnSpy).toHaveBeenCalledWith("[WARN] [WarnModule] Test warning");
  });

  test("logs error messages with default module name", () => {
    logger.error("Test error");
    expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR] [General] Test error");
  });

  test("logs error messages with a specific module name", () => {
    logger.error("Test error", "ErrorModule");
    expect(consoleErrorSpy).toHaveBeenCalledWith("[ERROR] [ErrorModule] Test error");
  });
});
