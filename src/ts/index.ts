// @ts-ignore
import { Decoder } from "./decoder";

export interface PIDAnalyzerHeaderInformation {
  fwType: "Betaflight" | "KISS" | "Raceflight";
  rollPID: [number, number, number];
  pitchPID: [number, number, number];
  yawPID: [number, number, number];
  maxThrottle: number;
  tpaBreakpoint: number;
}

type GyroKeyPrefix = "gyroADC" | "ugyroADC" | "gyroData";

type TripletSuffix = `[${0 | 1 | 2}]`;

type GyroDataKey = `${GyroKeyPrefix}${TripletSuffix}`;

type LogKey =
  | "time (us)"
  | `rcCommand${TripletSuffix}`
  | "rcCommand[3]"
  | `axisP${TripletSuffix}`
  | `axisI${TripletSuffix}`
  | `axisD${TripletSuffix}`
  | `debug${TripletSuffix}`
  | "debug[3]"
  | GyroDataKey;

export type PIDAnalyzerLogData = {
  [key in LogKey]: number[];
};

// define pyodie window property
declare global {
  interface Window {
    loadPyodide: any;
  }
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
}

export interface PIDAnalyzerTraces {
  roll: PIDAnalyzerTraceData;
  pitch: PIDAnalyzerTraceData;
  yaw: PIDAnalyzerTraceData;
}

export class PIDAnalyzer {
  private pyodide: any;
  private pythonCode?: string;
  private fileOrigin?: string;
  private decoder: Decoder;

  private static PYODIDE_VERSION = "0.25.0";
  // private static pyodideModuleUrl = `https://cdn.jsdelivr.net/pyodide/v${PIDAnalyzer.PYODIDE_VERSION}/full/pyodide.js`;
  // private static fallbackPyodideIndexURL = `https://cdn.jsdelivr.net/pyodide/v${PIDAnalyzer.PYODIDE_VERSION}/full/`;

  private static REQUIREMENTS = {
    global: {
      micropip: "micropip-0.5.0-py3-none-any.whl",
    },
    main: {
      numpy: "numpy-1.26.1-cp311-cp311-emscripten_3_1_46_wasm32.whl",
      pandas: "pandas-1.5.3-cp311-cp311-emscripten_3_1_46_wasm32.whl",
      scipy: "scipy-1.11.2-cp311-cp311-emscripten_3_1_46_wasm32.whl",
    },
    sub: {
      openblas: "openblas-0.3.23.zip",
      packaging: "packaging-23.1-py3-none-any.whl",
      python_dateutil: "python_dateutil-2.8.2-py2.py3-none-any.whl",
      pytz: "pytz-2023.3-py2.py3-none-any.whl",
      six: "six-1.16.0-py2.py3-none-any.whl",
    },
  };

  // function to dynamically load the pydide module if not present
  private async loadPyodide() {
    if (!this.pyodide) {
      if (!window.loadPyodide) {
        await this.loadPyodideViaScriptTag();
      }

      const indexURL = this.fileOrigin;

      this.pyodide = await window.loadPyodide({
        indexURL,
      });
    }

    return this.pyodide;
  }

  // function to load the pyodide module
  private async loadPyodideViaScriptTag() {
    const pyodideModuleUrl = `${this.fileOrigin}/pyodide.js`;

    const pyodideScript = document.createElement("script");
    pyodideScript.src = pyodideModuleUrl;
    document.body.appendChild(pyodideScript);

    await new Promise((resolve) => {
      pyodideScript.onload = resolve;
    });
  }

  private getPyodide() {
    if (!this.pyodide) {
      throw new Error("Please init first by calling .init()");
    }

    return this.pyodide;
  }

  private requirementsKeyToArray(key: keyof typeof PIDAnalyzer.REQUIREMENTS) {
    const requirements: string[] = [];

    Object.entries(PIDAnalyzer.REQUIREMENTS[key]).forEach(
      ([name, cdnFileName]) => {
        if (this.fileOrigin) {
          requirements.push(`${this.fileOrigin}/packages/${cdnFileName}`);
        } else {
          requirements.push(name);
        }
      }
    );

    return requirements;
  }

  private async loadPackages() {
    const pyodide = this.getPyodide();

    const requirements: string[] = [];

    requirements.push(
      ...this.requirementsKeyToArray("global"),
      ...this.requirementsKeyToArray("sub")
    );

    requirements.push(...this.requirementsKeyToArray("main"));

    console.log("requirements", requirements);

    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");

    await Promise.all(
      Object.keys(PIDAnalyzer.REQUIREMENTS.main).map((name) => {
        return micropip.install(name);
      })
    );
  }

  private async loadCode() {
    this.pythonCode = `${/* DO NOT REMOVE ME: START OF PYTHON CODE */ ""}
        ${await fetch("./PID-Analyzer.py").then((response) => response.text())}
        ${/* DO NOT REMOVE ME: END OF PYTHON CODE */ ""}`.trim();
  }

  public async init(fileOrigin: string) {
    console.log("initiating PIDAnalyzer with fileOrigin", fileOrigin);

    this.fileOrigin = `${fileOrigin}/pid-analyzer`;

    this.decoder = new Decoder(`${fileOrigin}/blackbox-decoder`);

    await Promise.all([
      (async () => {
        await this.loadPyodide();
        await this.loadPackages();
      })(),
      this.loadCode(),
    ]);

    console.log("initialisation is done!");
  }

  public async analyze(
    logFile: File,
    // headerInformation: PIDAnalyzerHeaderInformation,
    // logData: PIDAnalyzerLogData
  ): Promise<{
    traces: PIDAnalyzerTraces;
    headerInformation: PIDAnalyzerHeaderInformation;
  }> {
    await this.decoder.decodeBlackbox(logFile);

    throw new Error('End of the road');

    /*
    const pyodide = this.getPyodide();

    if (!this.pythonCode) {
      throw new Error("pythonCode not loaded yet...");
    }

    console.log("using", {
      generalInformation: headerInformation,
      logData,
    });

    pyodide.FS.writeFile("data.json", JSON.stringify(logData), {
      encoding: "utf8",
    });
    pyodide.FS.writeFile(
      "headdict.json",
      JSON.stringify({
        ...headerInformation,
        rollPID: `${headerInformation.rollPID[0]},${headerInformation.rollPID[1]},${headerInformation.rollPID[2]}`,
        pitchPID: `${headerInformation.pitchPID[0]},${headerInformation.pitchPID[1]},${headerInformation.pitchPID[2]}`,
        yawPID: `${headerInformation.yawPID[0]},${headerInformation.yawPID[1]},${headerInformation.yawPID[2]}`,
      }),
      {
        encoding: "utf8",
      }
    );

    // Pyodide is now ready to use...
    pyodide.runPython(this.pythonCode);

    const responsePitchRaw = pyodide.FS.readFile("response_pitch.json", {
      encoding: "utf8",
    });
    const responsePitch = JSON.parse(responsePitchRaw);

    const responseRollRaw = pyodide.FS.readFile("response_roll.json", {
      encoding: "utf8",
    });
    const responseRoll = JSON.parse(responseRollRaw);

    const responseYawRaw = pyodide.FS.readFile("response_yaw.json", {
      encoding: "utf8",
    });
    const responseYaw = JSON.parse(responseYawRaw);

    const headdictRaw = pyodide.FS.readFile("headdict.json", {
      encoding: "utf8",
    });
    const headdict = JSON.parse(headdictRaw);

    return {
      headerInformation: headdict,
      traces: {
        roll: responseRoll,
        pitch: responsePitch,
        yaw: responseYaw,
      },
    };
    */
  }
}
