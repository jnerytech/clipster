import fs from "fs";
import * as vscode from "vscode";
import {
  traverseDirectory,
  createDirectoriesRecursively,
} from "../directoryUtils";

jest.mock("fs");

const mockFs = jest.mocked(fs);

/** Helper to create a minimal Dirent-like object. */
function makeDirent(name: string): fs.Dirent {
  return { name } as unknown as fs.Dirent;
}

describe("directoryUtils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no .gitignore, all entries are plain files
    mockFs.existsSync.mockReturnValue(false);
    mockFs.statSync.mockReturnValue({
      isFile: () => true,
      isDirectory: () => false,
    } as unknown as fs.Stats);
  });

  describe("traverseDirectory", () => {
    it("returns empty string for an empty directory", () => {
      (mockFs.readdirSync as jest.Mock).mockReturnValue([]);
      const result = traverseDirectory("/dir", "/dir");
      expect(result).toBe("");
    });

    it("returns empty string and shows error when readdirSync throws", () => {
      (mockFs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error("EACCES: permission denied");
      });
      const result = traverseDirectory("/dir", "/dir");
      expect(result).toBe("");
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    it("lists a single file entry", () => {
      (mockFs.readdirSync as jest.Mock).mockReturnValue([makeDirent("index.ts")]);
      mockFs.statSync.mockReturnValue({
        isFile: () => true,
        isDirectory: () => false,
      } as unknown as fs.Stats);
      const result = traverseDirectory("/dir", "/dir");
      expect(result).toContain("index.ts");
    });

    it("places files after directories", () => {
      (mockFs.readdirSync as jest.Mock).mockImplementation((p: unknown) => {
        if (String(p) === "/dir") {
          return [makeDirent("src"), makeDirent("README.md")];
        }
        return [];
      });
      (mockFs.statSync as jest.Mock).mockImplementation((p: unknown) => ({
        isFile: () => !String(p).endsWith("src"),
        isDirectory: () => String(p).endsWith("src"),
      }));

      const result = traverseDirectory("/dir", "/dir");
      const srcIndex = result.indexOf("src");
      const readmeIndex = result.indexOf("README.md");
      expect(srcIndex).toBeGreaterThanOrEqual(0);
      expect(readmeIndex).toBeGreaterThanOrEqual(0);
      expect(srcIndex).toBeLessThan(readmeIndex);
    });

    it("recurses into subdirectories that have visible children", () => {
      (mockFs.readdirSync as jest.Mock).mockImplementation((p: unknown) => {
        if (String(p) === "/dir") {
          return [makeDirent("sub")];
        }
        return [makeDirent("child.ts")];
      });
      (mockFs.statSync as jest.Mock).mockImplementation((p: unknown) => ({
        isFile: () => !String(p).endsWith("sub"),
        isDirectory: () => String(p).endsWith("sub"),
      }));

      const result = traverseDirectory("/dir", "/dir");
      expect(result).toContain("sub");
      expect(result).toContain("child.ts");
    });

    it("does not recurse into empty subdirectories", () => {
      (mockFs.readdirSync as jest.Mock).mockImplementation((p: unknown) => {
        if (String(p) === "/dir") {
          return [makeDirent("emptyDir")];
        }
        return [];
      });
      mockFs.statSync.mockReturnValue({
        isFile: () => false,
        isDirectory: () => true,
      } as unknown as fs.Stats);

      const result = traverseDirectory("/dir", "/dir");
      expect(result).toContain("emptyDir");
    });

    it("skips entries that throw on stat", () => {
      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        makeDirent("good.ts"),
        makeDirent("bad.ts"),
      ]);
      (mockFs.statSync as jest.Mock).mockImplementation((p: unknown) => {
        if (String(p).endsWith("bad.ts")) {
          throw new Error("stat failed");
        }
        return { isFile: () => true, isDirectory: () => false };
      });

      const result = traverseDirectory("/dir", "/dir");
      expect(result).toContain("good.ts");
    });
  });

  describe("createDirectoriesRecursively", () => {
    it("calls mkdirSync with recursive option and returns true", () => {
      mockFs.mkdirSync.mockReturnValue(undefined);
      const result = createDirectoriesRecursively("/some/nested/path");
      expect(result).toBe(true);
      expect(mockFs.mkdirSync).toHaveBeenCalledWith("/some/nested/path", {
        recursive: true,
      });
    });

    it("returns false and shows error when mkdirSync throws", () => {
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });
      const result = createDirectoriesRecursively("/some/path");
      expect(result).toBe(false);
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });
});
