declare global {
  interface Window {
    BlackboxDecodeModule: any;
  }
}

export class Decoder {
  private readonly fileOrigin: string;
  private BlackboxDecodeModule?: any;

  public constructor(fileOrigin: string) {
    this.fileOrigin = fileOrigin;
  }

  // function to dynamically load the pydide module if not present
  private async load() {
    if (!this.BlackboxDecodeModule) {
      if (!window.BlackboxDecodeModule) {
        await this.loadScriptTag();
      }

      this.BlackboxDecodeModule = await window.BlackboxDecodeModule();
      await this.BlackboxDecodeModule.ready;
    }

    return this.BlackboxDecodeModule;
  }

  // function to load the pyodide module
  private async loadScriptTag() {
    const moduleUrl = `${this.fileOrigin}/blackbox_decode.js`;

    const sctiptTag = document.createElement("script");
    sctiptTag.src = moduleUrl;
    document.body.appendChild(sctiptTag);

    await new Promise((resolve) => {
      sctiptTag.onload = resolve;
    });
  }

  public async decodeBlackbox(blackbox: ArrayBuffer) {
    await this.load();

    console.log("BB DECODER: checking if /logs/logfile.bbl exists");
    const {exists: logFileExists} = await this.BlackboxDecodeModule.FS.analyzePath("/logs/logfile.bbl");
    if (logFileExists) {
      console.log("BB DECODER: removing existing .bbl file");
      await this.BlackboxDecodeModule.FS.unlink("/logs/logfile.bbl");
    }

    console.log("BB DECODER: checking if /logs directory exists");
    const {exists: logsDirExists} = await this.BlackboxDecodeModule.FS.analyzePath("/logs");
    if (!logsDirExists) {
      console.log("BB DECODER: creating /logs directory");
      await this.BlackboxDecodeModule.FS.mkdir("/logs");
    }

    console.log("BB DECODER: writing .bbl to FS");
    await this.BlackboxDecodeModule.FS.writeFile("/logs/logfile.bbl", blackbox);

    this.BlackboxDecodeModule.print = function (index) {
      let memory = new Uint8Array(
        this.BlackboxDecodeModule.instance.exports.memory.buffer
      );
      let string = "";
      while (memory[index] !== 0) {
        string += String.fromCharCode(memory[index++]);
      }
      console.log(`BB DECODER >> ${string}`);
    };

    console.log("BB DECODER: decoding");
    this.BlackboxDecodeModule._decode();
    console.log("BB DECODER: decoding done");

    const files = this.BlackboxDecodeModule.FS.readdir("/logs");
    console.log("BB DECODER: files in FS", files);

    const csvFileNames = files.filter((file: string) => file.endsWith(".csv"));
    const csvFiles = csvFileNames.map((fileName: string) => {
      const csv = this.BlackboxDecodeModule.FS.readFile(`/logs/${fileName}`, {
        encoding: "utf8",
      });
      return { fileName, content: csv };
    });

    console.log("BB DECODER: csv files", csvFiles);
    return csvFiles;
  }
}
