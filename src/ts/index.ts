// @ts-ignore
import { Decoder } from "./decoder";

// define pyodie window property
declare global {
  interface Window {
    loadPyodide: any;
  }
}

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
  hist2d_sm: number[];
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

export class PIDAnalyzer {
  private pyodide: any;
  private pythonCode?: string;
  private fileOrigin?: string;
  private decoder: Decoder;

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
    this.fileOrigin = `${fileOrigin}/pid-analyzer`;

    this.decoder = new Decoder(`${fileOrigin}/blackbox-decoder`);

    await Promise.all([
      (async () => {
        await this.loadPyodide();
        await this.loadPackages();
      })(),
      this.loadCode(),
    ]);
  }

  public async analyze(
    logFile: ArrayBuffer,
    onStatus?: (status: string, payload?: any) => void
  ): Promise<PIDAnalyzerResult[]> {
    if (!this.pythonCode) {
      throw new Error("pythonCode not loaded yet...");
    }

    const pyodide = this.getPyodide();

    const { exists: logFileExists } = await pyodide.FS.analyzePath(
      "/logs/flightlog.bbl"
    );
    if (logFileExists) {
      await pyodide.FS.unlink("/logs/flightlog.bbl");
    }

    const { exists: logsDirExists } = await pyodide.FS.analyzePath("/logs");
    if (!logsDirExists) {
      await pyodide.FS.mkdir("/logs");
    }
    pyodide.FS.writeFile("/logs/flightlog.bbl", logFile);

    pyodide.registerJsModule("blackbox_decoder", {
      decode: async (path) => {
        try {
          const file = pyodide.FS.readFile(path);
          const decodedFiles = await this.decoder.decodeBlackbox(file);
          for (const decodedFile of decodedFiles) {
            const bblFileStart = path.split("/").pop().replace(".bbl", "");
            const csvIndex = decodedFile.fileName.split(".")[1];

            const outputFileName = `/logs/tmp/${bblFileStart}.${csvIndex}.csv`;

            await pyodide.FS.writeFile(outputFileName, decodedFile.content);
          }
        } catch (error) {}
      },
    });

    pyodide.registerJsModule("js_status", {
      reportStatusToJs: async (status, payloadProxy) => {
        let payload = payloadProxy;
        if (payloadProxy && typeof payloadProxy.toJs === "function") {
          payload = payloadProxy.toJs();
        }

        if (typeof onStatus === "function") {
          onStatus(status, payload);
        }
      },
    });

    await pyodide.runPythonAsync(this.pythonCode);

    const resultFiles = await pyodide.FS.readdir("/logs/tmp");

    const results: PIDAnalyzerResult[] = [];
    await Promise.all(
      resultFiles.map(async (fileName: string) => {
        if (fileName.startsWith(".")) {
          return;
        }

        const content = pyodide.FS.readFile(`/logs/tmp/${fileName}`, {
          encoding: "utf8",
        });

        await pyodide.FS.unlink(`/logs/tmp/${fileName}`);

        results.push(JSON.parse(content));
      })
    );

    return results;
  }
}
