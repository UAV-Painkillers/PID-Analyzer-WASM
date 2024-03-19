// @ts-ignore
import { Decoder } from "./decoder";
import { PythonAnalyzer } from "./python-analyser";
import type {
  DecoderResult, PIDAnalyzerResult,
} from "./types";
export * from "./types";

export class PIDAnalyzer {
  private pythonCode: string;
  private fileOrigin?: string;
  private decoder: Decoder;
  private pythonAnalyzer: PythonAnalyzer;

  public constructor(fileOrigin: string) {
    this.fileOrigin = `${fileOrigin}/pid-analyzer`;
    this.pythonAnalyzer = new PythonAnalyzer(this.fileOrigin);
    this.decoder = new Decoder(`${this.fileOrigin}/blackbox-decoder`);
  }

  public async init() {
    await this.pythonAnalyzer.init(),
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
