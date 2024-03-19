import { PyodideRuntime, PyodideStatusListener } from "./pyodide";
import { DecoderResult, PIDAnalyzerHeaderInformation, PIDAnalyzerResult } from "./types";

export enum PYTHON_ANALYZER_CODE_NAMES {
  FULL = "old/PID-Analyzer.py",
  SPLIT_BBL = "split-bbl.py",
  ANALYZE_ONE_FLIGHT = "analyze-one-flight.py",
}

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

  private async loadCode(name: PYTHON_ANALYZER_CODE_NAMES): Promise<string> {
    // TODO: update build pipeline to insert code here
    let code: string | undefined;
    switch (name) {
      case PYTHON_ANALYZER_CODE_NAMES.FULL: {
        code = `${
          /* PYTHON_CODE_WILL_BE_INSERTED_HERE:PID-Analyzer.py */ ""
        }`.trim();
      }
    }

    if (code === undefined) {
      code = (await fetch(`./${name}`).then((response) =>
        response.text()
      )) as string;
    }

    return code;
  }

  public async splitMainBBLIntoSubBBL(
    logFile: ArrayBuffer,
    onStatus?: PyodideStatusListener
  ): Promise<{header: PIDAnalyzerHeaderInformation, bbl: ArrayBuffer}[]> {
    const code = await this.loadCode(PYTHON_ANALYZER_CODE_NAMES.SPLIT_BBL);

    await this.pyodideRuntime.FS.writeFile("/log.bbl", new Uint8Array(logFile));
    await this.pyodideRuntime.runAsync(code, onStatus);
    
    const result = await this.pyodideRuntime.FS.readFile('/result.json', { encoding: 'utf8' });
    const resultJson = JSON.parse(result) as SplitterResult[];

    return await Promise.all(resultJson.map(async (splitterResult) => {
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
    }));
  }

  public async analyzeOneFlight(
    decoderResult: DecoderResult,
    onStatus?: PyodideStatusListener
  ): Promise<PIDAnalyzerResult> {
    const code = await this.loadCode(PYTHON_ANALYZER_CODE_NAMES.ANALYZE_ONE_FLIGHT);

    await this.pyodideRuntime.FS.writeFile(
      "/log.csv",
      decoderResult.csv
    );

    await this.pyodideRuntime.runAsync(code, onStatus);

    const analyzerResult = this.pyodideRuntime.FS.readFile(
      `/result.json`,
      {
        encoding: "utf8",
      }
    );

    return JSON.parse(analyzerResult) as PIDAnalyzerResult;
  }
}
