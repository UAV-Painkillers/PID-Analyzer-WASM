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

    const {exists: logFileExists} = await this.BlackboxDecodeModule.FS.analyzePath("/logs/logfile.bbl");
    if (logFileExists) {
      await this.BlackboxDecodeModule.FS.unlink("/logs/logfile.bbl");
    }

    const {exists: logsDirExists} = await this.BlackboxDecodeModule.FS.analyzePath("/logs");
    if (!logsDirExists) {
      await this.BlackboxDecodeModule.FS.mkdir("/logs");
    }

    await this.BlackboxDecodeModule.FS.writeFile("/logs/logfile.bbl", blackbox);

    this.BlackboxDecodeModule.print = function (index) {
      let memory = new Uint8Array(
        this.BlackboxDecodeModule.instance.exports.memory.buffer
      );
      let string = "";
      while (memory[index] !== 0) {
        string += String.fromCharCode(memory[index++]);
      }
    };

    this.BlackboxDecodeModule._decode();

    const files = this.BlackboxDecodeModule.FS.readdir("/logs");

    const csvFileNames = files.filter((file: string) => file.endsWith(".csv"));
    const csvFiles = csvFileNames.map((fileName: string) => {
      const csv = this.BlackboxDecodeModule.FS.readFile(`/logs/${fileName}`, {
        encoding: "utf8",
      });

      this.BlackboxDecodeModule.FS.unlink(`/logs/${fileName}`);

      return { fileName, content: csv };
    });

    await this.BlackboxDecodeModule.FS.unlink("/logs/logfile.bbl");

    return csvFiles;
  }
}
