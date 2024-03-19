// @ts-ignore
import { Decoder } from "./decoder";
import { PyodideRuntime } from "./pyodide";
import { PythonAnalyzer } from "./python-analyser";
import type {
  DecoderResult, PIDAnalyzerResult,
} from "./types";

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

  public async init() {
    await Promise.all([
      this.pyodideRuntime.init(),
      this.pythonAnalyzer.init(),
    ]);
  }

  public async decodeMainBBL(logFile: ArrayBuffer): Promise<DecoderResult[]> {
    const splitResults = await this.pythonAnalyzer.splitMainBBLIntoSubBBL(logFile);

    const allCsvFiles: DecoderResult[] = [];
    for (const {bbl, header} of splitResults) {
      const csvFile = await this.decoder.decodeBlackbox(bbl);
      allCsvFiles.push({
        csv: csvFile,
        header
      });
    }

    return allCsvFiles;
  }

  public async analyze(
    decoderResults: DecoderResult[],
    onStatus?: (status: string, payload?: any) => void
  ): Promise<PIDAnalyzerResult[]> {
    const results: PIDAnalyzerResult[] = [];
    for (const decoderResult of decoderResults) {
      const result = await this.pythonAnalyzer.analyzeOneFlight(
        decoderResult,
        onStatus
      );
      results.push(result);
    }

    return results;
  }
}
