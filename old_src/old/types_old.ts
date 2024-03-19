export interface PIDAnalyzerHeaderInformation {
  fwType: "Betaflight" | "KISS" | "Raceflight";
  rollPID: [number, number, number];
  pitchPID: [number, number, number];
  yawPID: [number, number, number];
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

export enum States {
  STATE_READING_HEADER,
}

export interface CSVFile {
  fileName: string;
  content: string;
}
