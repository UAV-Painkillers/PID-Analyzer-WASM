const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const pythonSrcDir = path.join(__dirname, "src/python");
const typescriptSrcDir = path.join(__dirname, "src/ts");

const typescriptCodeLoaderFileName = "code-loader.ts";
const typescriptCodeLoaderPath = path.join(
  typescriptSrcDir,
  typescriptCodeLoaderFileName
);

const distTsDir = path.join(__dirname, "dist-ts");
const typescriptCodeLoaderTempPath = path.join(
  distTsDir,
  typescriptCodeLoaderFileName
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
        await fs.promises
          .mkdir(destPath, { recursive: true })
          .catch((err) => console.error(err));
        await copyFiles(srcPath, destPath);
      }
      if (entry.isFile()) {
        await fs.promises
          .copyFile(srcPath, destPath)
          .catch((err) => console.error(err));
      }
    }
  };
  await copyFiles(typescriptSrcDir, distTsDir);

  let codeLoader = await fs.promises.readFile(typescriptCodeLoaderPath, "utf8");

  // determine start and end of python code fetching snippet
  // example: '${/* GEN_PY_CODE<PID-Analyzer.py> */""}';
  const startOfPlaceHolder = "${/* GEN_PY_CODE<";
  const endOfPlaceHolder = '> */ ""}';

  let indexOfPlaceHolderStart = codeLoader.indexOf(startOfPlaceHolder);
  let indexOfPlaceHolderEnd = codeLoader.indexOf(endOfPlaceHolder);
  while (indexOfPlaceHolderStart !== -1) {
    // get the filename from within the placeholder
    // load the files content from the python directory
    // replace the placeholder with the content of the file
    // continue until no more placeholders are found
    const fileName = codeLoader.substring(
      indexOfPlaceHolderStart + startOfPlaceHolder.length,
      indexOfPlaceHolderEnd
    );

    const pythonCode = (
      await fs.promises.readFile(path.join(pythonSrcDir, fileName), "utf8")
    )
      .split("`")
      .join("\\`")
      .split("\\n")
      .join("\\\\n");
    codeLoader =
      codeLoader.substring(0, indexOfPlaceHolderStart) +
      pythonCode +
      codeLoader.substring(indexOfPlaceHolderEnd + endOfPlaceHolder.length);

    indexOfPlaceHolderStart = codeLoader.indexOf(startOfPlaceHolder);
    indexOfPlaceHolderEnd = codeLoader.indexOf(endOfPlaceHolder);
  }

  // write modified entrypoint to temp-dist
  await fs.promises.writeFile(typescriptCodeLoaderTempPath, codeLoader);

  execSync("npm run tsc -- -p tsconfig.types.json", {
    cwd: __dirname,
    stdio: "inherit",
  });
  execSync("npx webpack", { cwd: __dirname, stdio: "inherit" });

  // delete dist-ts
  fs.rmSync(distTsDir, { recursive: true });
};

main().catch(console.error);
