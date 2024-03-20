// @ts-ignore
import { Decoder } from "./decoder";
import { PythonAnalyzer } from "./python-analyser";
import type {
  AnalyzeOneFlightStep,
  AnalyzeOneFlightStepToPayloadMap,
  DecoderResult,
  PIDAnalyzerResult,
  SplitBBLStep,
  SplitBBLStepToPayloadMap,
} from "./types";
export * from "./types";

export type PIDAnalyzeStatusHandler = <
  TSplitStatus extends SplitBBLStep,
  TAnalyzeStatus extends AnalyzeOneFlightStep
>(
  status: TSplitStatus | TAnalyzeStatus,
  payload?:
    | AnalyzeOneFlightStepToPayloadMap[TAnalyzeStatus]
    | SplitBBLStepToPayloadMap[TSplitStatus]
) => any;

export class PIDAnalyzer {
  private decoder: Decoder;
  private pythonAnalyzer: PythonAnalyzer;

  public constructor(fileOrigin: string) {
    this.pythonAnalyzer = new PythonAnalyzer(`${fileOrigin}/pid-analyzer`);
    this.decoder = new Decoder(`${fileOrigin}/blackbox-decoder`);
  }

  public async init() {
    await Promise.all([this.pythonAnalyzer.init(), this.decoder.init()]);
  }

  public async decodeMainBBL(logFile: ArrayBuffer): Promise<DecoderResult[]> {
    const splitResults = await this.pythonAnalyzer.splitMainBBLIntoSubBBL(
      logFile
    );

    const allCsvFiles: DecoderResult[] = [];
    for (const { bbl, header } of splitResults) {
      const csvFiles = await this.decoder.decodeBlackbox(bbl);
      const firstCsvFile = csvFiles[0];

      allCsvFiles.push({
        csv: firstCsvFile.content,
        header,
      });
    }

    return allCsvFiles;
  }

  public async analyze(
    decoderResults: DecoderResult[],
    onStatus?: PIDAnalyzeStatusHandler
  ): Promise<PIDAnalyzerResult[]> {
    const results: PIDAnalyzerResult[] = [];
    let index = 0;
    for (const decoderResult of decoderResults) {
      index++;
      console.log("Analyzing one flight", index++);
      const result = await this.pythonAnalyzer.analyzeOneFlight(
        decoderResult,
        onStatus
      );
      results.push(result);
    }

    return results;
  }
}
