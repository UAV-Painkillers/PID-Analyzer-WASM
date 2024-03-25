export type PyodideStatusListener = (status: string, payload?: any) => void;

type MessageListener = (msg: string) => void;

declare global {
  interface Window {
    loadPyodide: (options: {
      indexURL?: string;
      stdout?: MessageListener;
      stderr?: MessageListener;
    }) => Promise<any>;
  }
}

export class PyodideRuntime {
  private static pyodide: any;
  private static fileOrigin?: string;
  private static runningExecution: Promise<void> | null = null;
  private static isInitiating: false | Promise<void> = false;
  private static debug = false;
  private static stderrListeners: MessageListener[] = [];
  private static onStatus: PyodideStatusListener | null = null;

  private static stdout(msg: string) {
    if (!PyodideRuntime.debug) {
      return;
    }

    console.log(msg);
  }

  private static stderr(msg: string) {
    PyodideRuntime.stderrListeners.forEach((listener) => listener(msg));

    if (!PyodideRuntime.debug) {
      return;
    }

    console.error(msg);
  }

  private static addStderrListener(listener: MessageListener) {
    PyodideRuntime.stderrListeners.push(listener);
  }

  private static removeStderrListener(listener: MessageListener) {
    PyodideRuntime.stderrListeners = PyodideRuntime.stderrListeners.filter(
      (l) => l !== listener
    );
  }

  public static setDebug(debug: boolean) {
    PyodideRuntime.debug = debug;
  }

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

  public static setFileOrigin(fileOrigin?: string) {
    PyodideRuntime.fileOrigin = fileOrigin;
  }

  private static async loadPyodide() {
    if (!PyodideRuntime.pyodide) {
      if (!window.loadPyodide) {
        await PyodideRuntime.loadPyodideViaScriptTag();
      }

      const indexURL = PyodideRuntime.fileOrigin;

      PyodideRuntime.pyodide = await window.loadPyodide({
        indexURL,
        stdout: (msg) => PyodideRuntime.stdout(msg),
        stderr: (msg) => PyodideRuntime.stderr(msg),
      });

      PyodideRuntime.pyodide.registerJsModule("js_status", {
        reportStatusToJs: async (status, payloadProxy) => {
          let payload = payloadProxy;
          if (payloadProxy && typeof payloadProxy.toJs === "function") {
            payload = payloadProxy.toJs();
          }

          if (typeof PyodideRuntime.onStatus === "function") {
            PyodideRuntime.onStatus(status, payload);
          }
        },
      });
    }

    return this.pyodide;
  }

  private static async loadPyodideViaScriptTag() {
    const pyodideModuleUrl = `${this.fileOrigin}/pyodide.js`;

    const pyodideScript = document.createElement("script");
    pyodideScript.src = pyodideModuleUrl;
    document.body.appendChild(pyodideScript);

    await new Promise((resolve) => {
      pyodideScript.onload = resolve;
    });
  }

  private static getPyodide() {
    if (!PyodideRuntime.pyodide) {
      throw new Error("Please init first by calling .init()");
    }

    return PyodideRuntime.pyodide;
  }

  private static requirementsKeyToArray(
    key: keyof typeof PyodideRuntime.REQUIREMENTS
  ) {
    const requirements: string[] = [];

    Object.entries(PyodideRuntime.REQUIREMENTS[key]).forEach(
      ([name, cdnFileName]) => {
        if (PyodideRuntime.fileOrigin) {
          requirements.push(
            `${PyodideRuntime.fileOrigin}/packages/${cdnFileName}`
          );
        } else {
          requirements.push(name);
        }
      }
    );

    return requirements;
  }

  private static async loadPackages() {
    const pyodide = PyodideRuntime.getPyodide();

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

  public static async init() {
    if (this.isInitiating) {
      return PyodideRuntime.isInitiating;
    }

    let resolveInit: () => void;
    PyodideRuntime.isInitiating = new Promise(
      (resolve) => (resolveInit = resolve)
    );

    await PyodideRuntime.loadPyodide();
    await PyodideRuntime.loadPackages();

    resolveInit!();
  }

  public get FS() {
    return PyodideRuntime.getPyodide().FS;
  }

  public async runAsync(code: string, onStatus?: PyodideStatusListener) {
    if (PyodideRuntime.runningExecution) {
      await PyodideRuntime.runningExecution;
    }

    let resolveCurrentExecution: () => void;
    PyodideRuntime.runningExecution = new Promise(
      (resolve) => (resolveCurrentExecution = resolve)
    );

    const pyodide = PyodideRuntime.getPyodide();
    const dict = pyodide.globals.get("dict");
    const globals = dict();
    try {
      PyodideRuntime.onStatus = (status, payload) => {
        onStatus?.(status, payload);
      };

      await pyodide.runPythonAsync(code, { globals, locals: globals });
    } catch (e) {
      console.error("Error while running python code", e);
    } finally {
      PyodideRuntime.onStatus = null;
      globals.destroy();
      dict.destroy();
      resolveCurrentExecution!();
    }
  }
}
