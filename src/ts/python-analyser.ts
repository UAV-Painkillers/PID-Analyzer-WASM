import { PYTHON_ANALYZER_CODE_NAMES, loadCode } from "./code-loader";
import { PyodideRuntime, PyodideStatusListener } from "./pyodide";
import {
  AnalyzeOneFlightStep,
  DecoderResult,
  PIDAnalyzerHeaderInformation,
  PIDAnalyzerResult,
  SplitBBLStep,
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
    await this.pyodideRuntime.init();
  }

  public async splitMainBBLIntoSubBBL(
    logFile: ArrayBuffer,
    onStatus?: (status: SplitBBLStep, payload: any) => any
  ): Promise<{ header: PIDAnalyzerHeaderInformation; bbl: ArrayBuffer }[]> {
    const code = await loadCode(PYTHON_ANALYZER_CODE_NAMES.SPLIT_BBL);

    await this.pyodideRuntime.FS.writeFile("/log.bbl", new Uint8Array(logFile));
    await this.pyodideRuntime.runAsync(code, (status, payload) => {
      onStatus?.(status as SplitBBLStep, payload);
    });

    const result = await this.pyodideRuntime.FS.readFile("/result.json", {
      encoding: "utf8",
    });
    const resultJson = JSON.parse(result) as SplitterResult[];

    const resultsWithContent = resultJson.filter(
      (r) => r.header.rollPID !== ""
    );

    const resultsWithSubBBLS = await Promise.all(
      resultsWithContent.map(async (splitterResult) => {
        const subBblFile = await this.pyodideRuntime.FS.readFile(
          splitterResult.bbl_filename,
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

    return resultsWithSubBBLS;
  }

  public async analyzeOneFlight(
    decoderResult: DecoderResult,
    onStatus?: (status: AnalyzeOneFlightStep, payload: any) => any
  ): Promise<PIDAnalyzerResult | null> {
    const code = await loadCode(PYTHON_ANALYZER_CODE_NAMES.ANALYZE_ONE_FLIGHT);

    await this.pyodideRuntime.FS.writeFile("/log.csv", decoderResult.csv);
    await this.pyodideRuntime.FS.writeFile(
      "/log-header.json",
      JSON.stringify(decoderResult.header)
    );

    let failure = false;
    try {
      await this.pyodideRuntime.runAsync(code, (status, payload) => {
        if (status === "ERROR") {
          failure = payload ?? true;
        }
        onStatus?.(status as AnalyzeOneFlightStep, payload);
      });
    } catch (e) {
      console.error(e);
      failure = true;
    }

    if (failure) {
      return null;
    }

    const headdictContent = this.pyodideRuntime.FS.readFile(
      `/results/headdict.json`,
      {
        encoding: "utf8",
      }
    );
    const headdict = JSON.parse(headdictContent);
    Object.entries(headdict).forEach(([key, value]) => {
      if (key.startsWith('simplified_')) {
        if (typeof value !== 'string') {
          return;
        }
        if (value.length === 0) {
          return;
        }

        const intValue = parseInt(value as string, 10) / 100;

        headdict[key] = intValue.toFixed(2);
      }
    });

    const axis = ["roll", "pitch", "yaw"];
    const [roll, pitch, yaw] = await Promise.all(
      axis.map(async (a) => {
        const data = this.pyodideRuntime.FS.readFile(
          `/results/trace_${a}.json`,
          {
            encoding: "utf8",
          }
        );
        return JSON.parse(data);
      })
    );

    return {
      headdict,
      roll,
      pitch,
      yaw,
    } as PIDAnalyzerResult;
  }
}
