// @ts-ignore
import { Decoder } from "../decoder";
import { PyodideRuntime } from "../pyodide";
import { PythonAnalyzer } from "../python-analyser";
import type {
  PIDAnalyzerHeaderInformation,
  PIDAnalyzerTraceNoiseData,
  PIDAnalyzerTraceData,
  PIDAnalyzerResult,
  States,
  CSVFile,
} from "./types_old";

// define pyodie window property
declare global {
  interface Window {
    loadPyodide: any;
  }
}

export class PIDAnalyzer {
  private pythonCode: string;
  private fileOrigin?: string;
  private decoder: Decoder;
  private pyodideRuntime: PyodideRuntime;
  private pythonAnalyzer: PythonAnalyzer;

  public constructor(fileOrigin: string) {
    this.fileOrigin = `${fileOrigin}/pid-analyzer`;
    this.pyodideRuntime = new PyodideRuntime(`${this.fileOrigin}/pid-analyzer`);
    this.pythonAnalyzer = new PythonAnalyzer(`${this.fileOrigin}/pid-analyzer`);
    this.decoder = new Decoder(`${this.fileOrigin}/blackbox-decoder`);
  }

  private async loadCode() {
    this.pythonCode = `${/* DO NOT REMOVE ME: START OF PYTHON CODE */ ""}
        ${await fetch("./PID-Analyzer.py").then((response) => response.text())}
        ${/* DO NOT REMOVE ME: END OF PYTHON CODE */ ""}`.trim();
  }

  public async init() {
    await Promise.all([this.pyodideRuntime.init(), this.loadCode(), this.pythonAnalyzer.init()]);
  }

  public async decodeMainBBL(logFile: ArrayBuffer) {
    const subBBLs = await this.pythonAnalyzer.splitMainBBLIntoSubBBL(logFile);

    const allCsvFiles: CSVFile[] = [];
    for (const subBBL of subBBLs) {
      const csvFile = await this.decoder.decodeBlackbox(subBBL);
      allCsvFiles.push(csvFile);
    }

    return allCsvFiles;
  }

  public async analyze(
    logFile: ArrayBuffer,
    onStatus?: (status: string, payload?: any) => void
  ): Promise<PIDAnalyzerResult[]> {
    if (!this.pythonCode) {
      throw new Error("pythonCode not loaded yet...");
    }

    const { exists: logFileExists } = await this.pyodideRuntime.FS.analyzePath(
      "/logs/flightlog.bbl"
    );
    if (logFileExists) {
      await this.pyodideRuntime.FS.unlink("/logs/flightlog.bbl");
    }

    const { exists: logsDirExists } = await this.pyodideRuntime.FS.analyzePath(
      "/logs"
    );
    if (!logsDirExists) {
      await this.pyodideRuntime.FS.mkdir("/logs");
    }
    this.pyodideRuntime.FS.writeFile("/logs/flightlog.bbl", logFile);

    this.pyodideRuntime.registerJsModule("blackbox_decoder", {
      decode: async (path) => {
        try {
          const file = this.pyodideRuntime.FS.readFile(path);
          const decodedFiles = await this.decoder.decodeBlackbox(file);
          for (const decodedFile of decodedFiles) {
            const bblFileStart = path.split("/").pop().replace(".bbl", "");
            const csvIndex = decodedFile.fileName.split(".")[1];

            const outputFileName = `/logs/tmp/${bblFileStart}.${csvIndex}.csv`;

            await this.pyodideRuntime.FS.writeFile(
              outputFileName,
              decodedFile.content
            );
          }
        } catch (error) {}
      },
    });

    if (typeof onStatus === "function") {
      this.pyodideRuntime.attachStatusListener(onStatus);
    }

    await this.pyodideRuntime.runAsync(this.pythonCode);

    const resultFiles = await this.pyodideRuntime.FS.readdir("/logs/tmp");

    const results: PIDAnalyzerResult[] = [];
    await Promise.all(
      resultFiles.map(async (fileName: string) => {
        if (fileName.startsWith(".")) {
          return;
        }

        const content = this.pyodideRuntime.FS.readFile(
          `/logs/tmp/${fileName}`,
          {
            encoding: "utf8",
          }
        );

        await this.pyodideRuntime.FS.unlink(`/logs/tmp/${fileName}`);

        results.push(JSON.parse(content));
      })
    );

    return results;
  }
}
