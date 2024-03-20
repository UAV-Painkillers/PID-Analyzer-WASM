export interface PIDAnalyzerHeaderInformation {
  fwType: "Betaflight" | "KISS" | "Raceflight";
  rollPID: string;
  pitchPID: string;
  yawPID: string;
  maxThrottle: number;
  tpa_breakpoint: number;
  tpa_percent: number;
}

export interface PIDAnalyzerTraceNoiseData {
  throt_hist_avr: number[];
  throt_axis: number[];
  freq_axis: number[];
  hist2d_norm: number[];
  hist2d_sm: number[][];
  hist2d: number[];
  max: number;
}

export interface PIDAnalyzerTraceData {
  name: string;
  gyro: number[];
  input: number[];
  time: number[];
  throttle: number[];
  avr_t: number[];
  spec_sm: number[];
  thr_response: {
    hist2d_norm: {
      histogram: number[];
      bins: number[];
    };
  };
  time_resp: number[];
  resp_low: [number[]];
  resp_high?: [number[]];
  high_mask: number[];
  noise_gyro: PIDAnalyzerTraceNoiseData;
  noise_d: PIDAnalyzerTraceNoiseData;
  noise_debug: PIDAnalyzerTraceNoiseData;
  filter_trans: number[];
}

export interface PIDAnalyzerResult {
  roll: PIDAnalyzerTraceData;
  pitch: PIDAnalyzerTraceData;
  yaw: PIDAnalyzerTraceData;
  headdict: PIDAnalyzerHeaderInformation;
}

export interface DecoderResult {
  csv: string;
  header: PIDAnalyzerHeaderInformation;
}

export enum AnalyzeOneFlightStep {
  WRITE_HEADDICT_TO_JSON_START = "WRITE_HEADDICT_TO_JSON_START",
  WRITE_HEADDICT_TO_JSON_COMPLETE = "WRITE_HEADDICT_TO_JSON_COMPLETE",
  ANALYZE_PID_START = "ANALYZE_PID_START",
  SAVING_ANALYSIS_TRACE_RESULT_START = "SAVING_ANALYSIS_TRACE_RESULT_START",
  SAVING_ANALYSIS_TRACE_RESULT_COMPLETE = "SAVING_ANALYSIS_TRACE_RESULT_COMPLETE",
  ANALYZE_PID_COMPLETE = "ANALYZE_PID_COMPLETE",
  READING_CSV_START = "READING_CSV_START",
  READING_CSV_COMPLETE = "READING_CSV_COMPLETE",
  START = "START",
  COMPLETE = "COMPLETE",
}
export type AnalyzeOneFlightStepToPayloadMap = {
  WRITE_HEADDICT_TO_JSON_START: undefined;
  WRITE_HEADDICT_TO_JSON_COMPLETE: undefined;
  ANALYZE_PID_START: undefined;
  SAVING_ANALYSIS_TRACE_RESULT_START: 'roll' | 'pitch' | 'yaw';
  SAVING_ANALYSIS_TRACE_RESULT_COMPLETE: 'roll' | 'pitch' | 'yaw';
  ANALYZE_PID_COMPLETE: undefined;
  READING_CSV_START: undefined;
  READING_CSV_COMPLETE: undefined;
  START: undefined;
  COMPLETE: undefined;
}

export enum SplitBBLStep {
  SPLITTING_BBL = "SPLITTING_BBL",
  BBLS_SPLITTED = "BBLS_SPLITTED",
  READING_HEADERS_START = "READING_HEADERS_START",
  READING_HEADERS_FROM_SUB_BBL_START = "READING_HEADERS_FROM_SUB_BBL_START",
  READING_HEADERS_FROM_SUB_BBL_COMPLETE = "READING_HEADERS_FROM_SUB_BBL_COMPLETE",
  READING_HEADERS_COMPLETE = "READING_HEADERS_COMPLETE",
  RUNNING = "RUNNING",
  COMPLETE = "COMPLETE",
}

export type SplitBBLStepToPayloadMap = {
  [SplitBBLStep.SPLITTING_BBL]: undefined;
  [SplitBBLStep.BBLS_SPLITTED]: number;
  [SplitBBLStep.READING_HEADERS_START]: number;
  [SplitBBLStep.READING_HEADERS_FROM_SUB_BBL_START]: number;
  [SplitBBLStep.READING_HEADERS_FROM_SUB_BBL_COMPLETE]: number;
  [SplitBBLStep.READING_HEADERS_COMPLETE]: undefined;
  [SplitBBLStep.RUNNING]: undefined;
  [SplitBBLStep.COMPLETE]: undefined;
};