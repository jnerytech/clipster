import os from "os";
import { formatStructure, formatRootFolder } from "../structureFormatter";

describe("structureFormatter", () => {
  describe("formatStructure", () => {
    it("formats last item with ┗ prefix", () => {
      const result = formatStructure("file.ts", "file", "", true);
      expect(result).toBe(`┗ file.ts${os.EOL}`);
    });

    it("formats non-last item with ┣ prefix", () => {
      const result = formatStructure("file.ts", "file", "", false);
      expect(result).toBe(`┣ file.ts${os.EOL}`);
    });

    it("includes indent before prefix", () => {
      const result = formatStructure("file.ts", "file", "  ", true);
      expect(result).toBe(`  ┗ file.ts${os.EOL}`);
    });

    it("includes indent for non-last item", () => {
      const result = formatStructure("folder", "folder", "┃ ", false);
      expect(result).toBe(`┃ ┣ folder${os.EOL}`);
    });

    it("works for folder type", () => {
      const result = formatStructure("src", "folder", "", false);
      expect(result).toBe(`┣ src${os.EOL}`);
    });
  });

  describe("formatRootFolder", () => {
    it("formats root folder header with name and path", () => {
      const result = formatRootFolder("myProject", "/path/to/myProject");
      expect(result).toBe(`myProject${os.EOL}Path: /path/to/myProject${os.EOL}`);
    });

    it("works with different project names and paths", () => {
      const result = formatRootFolder("clipster", "/home/user/clipster");
      expect(result).toBe(`clipster${os.EOL}Path: /home/user/clipster${os.EOL}`);
    });
  });
});
