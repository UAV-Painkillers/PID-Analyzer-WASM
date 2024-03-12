const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const pythonSrcDir = path.join(__dirname, "src/python");
const typescriptSrcDir = path.join(__dirname, "src/ts");

const pythonAnalyzerFileName = "PID-Analyzer.py";
const pythonAnalyzerPath = path.join(pythonSrcDir, pythonAnalyzerFileName);

/*
const pythonRequirementsFileName = "requirements.txt";
const pythonRequirementsPath = path.join(
  pythonSrcDir,
  pythonRequirementsFileName
);
*/

const typescriptEntryPointFileName = "index.ts";
const typescriptEntryPointPath = path.join(
  typescriptSrcDir,
  typescriptEntryPointFileName
);

const distTsDir = path.join(__dirname, "dist-ts");
const typescriptEntryPointTempPath = path.join(
  distTsDir,
  typescriptEntryPointFileName
);

const distDir = path.join(__dirname, "dist");

const main = async () => {
  // delete dist first to start fresh
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
  fs.mkdirSync(distDir);

  if (fs.existsSync(distTsDir)) {
    fs.rmSync(distTsDir, { recursive: true });
  }
  fs.mkdirSync(distTsDir);

  const pythonCode = (await fs.promises.readFile(pythonAnalyzerPath, "utf8"))
    .split("\\n")
    .join("\\\\n");

    /*
  const requirementsTXT = (
    await fs.promises.readFile(pythonRequirementsPath, "utf8")
  )
    .split("\\n")
    .join("\\\\n");
    */

  const lib = await fs.promises.readFile(typescriptEntryPointPath, "utf8");

  // determine start and end of python code fetching snippet
  const startOfPythonCodeIndicator =
    '${/* DO NOT REMOVE ME: START OF PYTHON CODE */ ""}';
  const endOfPythonCodeIndicator =
    '${/* DO NOT REMOVE ME: END OF PYTHON CODE */ ""}';

  const startOfPythonCode = lib.indexOf(startOfPythonCodeIndicator);
  const endOfPythonCode =
    lib.indexOf(endOfPythonCodeIndicator) + endOfPythonCodeIndicator.length;

  // insert python code and requirements into entrypoint
  const libWithPythonCode =
    lib.slice(0, startOfPythonCode) + pythonCode + lib.slice(endOfPythonCode);

  /*
  const startOfRequirementsIndicator =
    '${/* DO NOT REMOVE ME: START OF REQUIREMENTS *//* ""}';
  const endOfRequirementsIndicator =
    '${/* DO NOT REMOVE ME: END OF REQUIREMENTS *//* ""}';

  const startOfRequirements = libWithPythonCode.indexOf(
    startOfRequirementsIndicator
  );
  const endOfRequirements =
    libWithPythonCode.indexOf(endOfRequirementsIndicator) +
    endOfRequirementsIndicator.length;

  const libWithPythonCodeAndRequirements =
    libWithPythonCode.slice(0, startOfRequirements) +
    requirementsTXT +
    libWithPythonCode.slice(endOfRequirements);
  */

  // clear out temp-dist directory
  const filesInDistTsDir = await fs.promises.readdir(distTsDir);
  for (const file of filesInDistTsDir) {
    await fs.promises.unlink(path.join(distTsDir, file));
  }

  // recursive copy over all files and folders to temp-dist
  const copyFiles = async (src, dest) => {
    const entries = await fs.promises
      .readdir(src, { withFileTypes: true })
      .catch((err) => console.error(err));

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await fs
          .promises.mkdir(destPath, { recursive: true })
          .catch((err) => console.error(err));
        await copyFiles(srcPath, destPath);
      }
      if (entry.isFile()) {
        await fs
          .promises.copyFile(srcPath, destPath)
          .catch((err) => console.error(err));
      }
    }
  }
  await copyFiles(typescriptSrcDir, distTsDir);
  
  // write modified entrypoint to temp-dist
  await fs.promises.writeFile(
    typescriptEntryPointTempPath,
    // libWithPythonCodeAndRequirements
    libWithPythonCode
  );

  // now we need to run the tsc compiler on the modified lib.ts
  // execSync("npm run tsc -- -p tsconfig.json", { cwd: __dirname, stdio: "inherit" });
  // execSync("npm run tsc -- -p tsconfig.cjs.json", { cwd: __dirname, stdio: "inherit" });
  execSync("npm run tsc -- -p tsconfig.types.json", { cwd: __dirname, stdio: "inherit" });
  execSync("npx webpack", { cwd: __dirname, stdio: "inherit" });

  // delete dist-ts
  fs.rmSync(distTsDir, { recursive: true });
};

main().catch(console.error);
