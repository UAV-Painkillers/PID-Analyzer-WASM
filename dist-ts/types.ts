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
