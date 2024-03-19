export type PyodideStatusListener = (status: string, payload?: any) => void;

export class PyodideRuntime {
  private pyodide: any;
  private fileOrigin?: string;
  private statusListeners: Array<(status: string, payload?: any) => any> = [];

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

  public constructor(fileOrigin?: string) {
    this.fileOrigin = fileOrigin;
  }

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

  private requirementsKeyToArray(
    key: keyof typeof PyodideRuntime.REQUIREMENTS
  ) {
    const requirements: string[] = [];

    Object.entries(PyodideRuntime.REQUIREMENTS[key]).forEach(
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
      Object.keys(PyodideRuntime.REQUIREMENTS.main).map((name) => {
        return micropip.install(name);
      })
    );
  }

  public async init() {
    await Promise.all([this.loadPyodide(), this.loadPackages()]);

    this.pyodide.registerJsModule("js_status", {
      reportStatusToJs: async (status, payloadProxy) => {
        let payload = payloadProxy;
        if (payloadProxy && typeof payloadProxy.toJs === "function") {
          payload = payloadProxy.toJs();
        }

        this.broadCastStatus(status, payload);
      },
    });
  }

  public get FS() {
    return this.getPyodide().FS;
  }

  public registerJsModule(name: string, module: any) {
    this.getPyodide().registerJsModule(name, module);
  }

  public async runAsync(code: string, onStatus?: PyodideStatusListener) {
    if (typeof onStatus === "function") {
        this.attachStatusListener(onStatus);
    }
    
    await this.getPyodide().runPythonAsync(code);

    if (typeof onStatus === "function") {
        this.detachStatusListener(onStatus);
    }
  }

  public attachStatusListener(listener: PyodideStatusListener) {
    this.statusListeners.push(listener);
  }

  public detachStatusListener(listener: PyodideStatusListener) {
    this.statusListeners = this.statusListeners.filter(
      (l) => l !== listener
    );
  }

  private broadCastStatus(status: string, payload: any) {
    this.statusListeners.forEach((listener) => {
      listener(status, payload);
    });
  }
}
