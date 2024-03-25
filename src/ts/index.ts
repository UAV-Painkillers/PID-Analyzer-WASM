// @ts-ignore
import { Decoder } from "./decoder";
import { PythonAnalyzer } from "./python-analyser";
import {
  AnalyzeOneFlightStep,
  AnalyzeOneFlightStepToPayloadMap,
  DecoderResult,
  PIDAnalyzerResult,
  SplitBBLStep,
  SplitBBLStepToPayloadMap,
} from "./types";
export {
  SplitBBLStep,
  SplitBBLStepToPayloadMap,
  AnalyzeOneFlightStep,
  AnalyzeOneFlightStepToPayloadMap,
  PIDAnalyzerHeaderInformation,
  PIDAnalyzerResult,
  PIDAnalyzerTraceData,
} from "./types";

export type PIDAnalyzeStatusHandler = <
  TAnalyzeStatus extends AnalyzeOneFlightStep
>(
  status: TAnalyzeStatus,
  flightLogIndex: number,
  payload?: AnalyzeOneFlightStepToPayloadMap[TAnalyzeStatus]
) => any;

export type DecodeStatusHandler = <TDecodeStatus extends SplitBBLStep>(
  status: TDecodeStatus,
  payload?: SplitBBLStepToPayloadMap[TDecodeStatus]
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

  public async decodeMainBBL(
    logFile: ArrayBuffer,
    onStatus?: DecodeStatusHandler
  ): Promise<DecoderResult[]> {
    const splitResults = await this.pythonAnalyzer.splitMainBBLIntoSubBBL(
      logFile,
      onStatus
    );

    const allCsvFiles: DecoderResult[] = [];
    for (let index = 0; index < splitResults.length; index++) {
      onStatus?.(SplitBBLStep.DECODING_SUB_BBL_START, index);
      const { header, bbl } = splitResults[index];
      const csvFiles = await this.decoder.decodeBlackbox(bbl);

      const csvLogFile = csvFiles.find((f) => f.fileName === "logfile.01.csv");
      console.log("got files from decoder", {
        csvFiles,
        csvLogFile,
      });

      allCsvFiles.push({
        csv: csvLogFile?.content ?? '',
        header,
      });
      onStatus?.(SplitBBLStep.DECODING_SUB_BBL_COMPLETE, index);
    }

    return allCsvFiles;
  }

  public async analyze(
    decoderResults: DecoderResult[],
    onStatus?: PIDAnalyzeStatusHandler
  ): Promise<PIDAnalyzerResult[]> {
    const results: PIDAnalyzerResult[] = [];

    for (let index = 0; index < decoderResults.length; index++) {
      console.log(`Analyzing flight #${index}`);

      const result = await this.pythonAnalyzer
        .analyzeOneFlight(decoderResults[index], (status, payload) =>
          onStatus?.(status, index, payload)
        )
        .catch((e) => {
          console.warn(`Analysis of flight ${index} failed`, e);
          return null;
        });

      if (!result) {
        continue;
      }

      results.push(result);
    }

    return results;
  }
}
