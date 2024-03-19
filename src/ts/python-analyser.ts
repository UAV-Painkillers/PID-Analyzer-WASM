import { PYTHON_ANALYZER_CODE_NAMES, loadCode } from "./code-loader";
import { PyodideRuntime, PyodideStatusListener } from "./pyodide";
import {
  DecoderResult,
  PIDAnalyzerHeaderInformation,
  PIDAnalyzerResult,
} from "./types";


interface SplitterResult {
  header: PIDAnalyzerHeaderInformation;
  bbl_filename: string;
}

export class PythonAnalyzer {
  private readonly pyodideRuntime: PyodideRuntime;

  public constructor(fileOrigin?: string) {
    this.pyodideRuntime = new PyodideRuntime(fileOrigin);
  }

  public async init(): Promise<void> {
    this.pyodideRuntime.init();
  }

  public async splitMainBBLIntoSubBBL(
    logFile: ArrayBuffer,
    onStatus?: PyodideStatusListener
  ): Promise<{ header: PIDAnalyzerHeaderInformation; bbl: ArrayBuffer }[]> {
    const code = await loadCode(PYTHON_ANALYZER_CODE_NAMES.SPLIT_BBL);

    await this.pyodideRuntime.FS.writeFile("/log.bbl", new Uint8Array(logFile));
    await this.pyodideRuntime.runAsync(code, onStatus);

    const result = await this.pyodideRuntime.FS.readFile("/result.json", {
      encoding: "utf8",
    });
    const resultJson = JSON.parse(result) as SplitterResult[];

    return await Promise.all(
      resultJson.map(async (splitterResult) => {
        const subBblFile = await this.pyodideRuntime.FS.readFile(
          `/${splitterResult.bbl_filename}`,
          {
            encoding: "binary",
          }
        );

        return {
          header: splitterResult.header,
          bbl: subBblFile,
        };
      })
    );
  }

  public async analyzeOneFlight(
    decoderResult: DecoderResult,
    onStatus?: PyodideStatusListener
  ): Promise<PIDAnalyzerResult> {
    const code = await loadCode(
      PYTHON_ANALYZER_CODE_NAMES.ANALYZE_ONE_FLIGHT
    );

    await this.pyodideRuntime.FS.writeFile("/log.csv", decoderResult.csv);

    await this.pyodideRuntime.runAsync(code, onStatus);

    const analyzerResult = this.pyodideRuntime.FS.readFile(`/result.json`, {
      encoding: "utf8",
    });

    return JSON.parse(analyzerResult) as PIDAnalyzerResult;
  }
}
