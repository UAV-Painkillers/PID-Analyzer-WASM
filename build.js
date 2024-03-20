import { execSync } from "child_process";
import { existsSync, rmSync, mkdirSync, promises } from "fs";
import { join } from "path";

const __dirname = process.cwd();

const pythonSrcDir = join(__dirname, "src/python");
const typescriptSrcDir = join(__dirname, "src/ts");

const typescriptCodeLoaderFileName = "code-loader.ts";
const typescriptCodeLoaderPath = join(
  typescriptSrcDir,
  typescriptCodeLoaderFileName
);

const distTsDir = join(__dirname, "dist-ts");
const typescriptCodeLoaderTempPath = join(
  distTsDir,
  typescriptCodeLoaderFileName
);

const distDir = join(__dirname, "dist");

const main = async () => {
  // delete dist first to start fresh
  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true });
  }
  mkdirSync(distDir);

  if (existsSync(distTsDir)) {
    rmSync(distTsDir, { recursive: true });
  }
  mkdirSync(distTsDir);

  // clear out temp-dist directory
  const filesInDistTsDir = await promises.readdir(distTsDir);
  for (const file of filesInDistTsDir) {
    await promises.unlink(join(distTsDir, file));
  }

  // recursive copy over all files and folders to temp-dist
  const copyFiles = async (src, dest) => {
    const entries = await promises
      .readdir(src, { withFileTypes: true })
      .catch((err) => console.error(err));

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        await promises
          .mkdir(destPath, { recursive: true })
          .catch((err) => console.error(err));
        await copyFiles(srcPath, destPath);
      }
      if (entry.isFile()) {
        await promises
          .copyFile(srcPath, destPath)
          .catch((err) => console.error(err));
      }
    }
  };
  await copyFiles(typescriptSrcDir, distTsDir);

  let codeLoader = await promises.readFile(typescriptCodeLoaderPath, "utf8");

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
      await promises.readFile(join(pythonSrcDir, fileName), "utf8")
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
  await promises.writeFile(typescriptCodeLoaderTempPath, codeLoader);

  execSync("npm run tsc -- -p tsconfig.types.json", {
    cwd: __dirname,
    stdio: "inherit",
  });
  execSync("npx webpack", { cwd: __dirname, stdio: "inherit" });

  // delete dist-ts
  rmSync(distTsDir, { recursive: true });
};

main().catch(console.error);
