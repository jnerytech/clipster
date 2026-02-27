// build.js
const { execSync } = require("child_process");
const {
  mkdirSync,
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
} = require("fs");
const path = require("path");

// Paths
const packageJsonPath = path.join(path.resolve(), "package.json");
const outDir = path.join(path.resolve(), "out");

// Step 1: Package the VSIX extension
const packageExtension = () => {
  try {
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    const version = JSON.parse(readFileSync(packageJsonPath, "utf8")).version;
    execSync(
      `vsce package --out ${path.join(outDir, `clipster-${version}.vsix`)}`,
      { stdio: "inherit" }
    );
    console.log("Extension packaged successfully.");
  } catch (error) {
    console.error("Failed to package extension:", error);
    process.exit(1);
  }
};

// Step 2: Install the latest VSIX file from the 'out' directory
const installLatestVsix = () => {
  const vsixFiles = readdirSync(outDir).filter((file) =>
    file.endsWith(".vsix")
  );

  if (vsixFiles.length === 0) {
    console.error("No .vsix files found in 'out' directory.");
    process.exit(1);
  }

  vsixFiles.sort((a, b) => {
    const aTime = statSync(path.join(outDir, a)).mtime;
    const bTime = statSync(path.join(outDir, b)).mtime;
    return bTime - aTime;
  });

  const latestVsix = vsixFiles[0];
  console.log(`Installing extension: ${latestVsix}`);

  try {
    execSync(`code --install-extension ${path.join(outDir, latestVsix)}`, {
      stdio: "inherit",
    });
    console.log(`Successfully installed: ${latestVsix}`);
  } catch (error) {
    console.error(`Failed to install: ${latestVsix}`);
    console.error(error);
    process.exit(1);
  }
};

packageExtension();
installLatestVsix();
