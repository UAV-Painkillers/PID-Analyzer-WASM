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

  public async decodeBlackbox(blackbox: ArrayBuffer): Promise<string> {
    await this.load();

    await this.BlackboxDecodeModule.FS.writeFile("/logfile.bbl", blackbox);
    this.BlackboxDecodeModule._decode();

    const filesInRootDirectory = this.BlackboxDecodeModule.FS.readdir("/");

    const decodedLogFileName = filesInRootDirectory.find((file: string) => file.endsWith(".csv"));
    const csvFile = await this.BlackboxDecodeModule.FS.readFile(
      `/${decodedLogFileName}`,
      {
        encoding: "utf8",
      }
    ) as string;
    await this.BlackboxDecodeModule.FS.unlink(`/${decodedLogFileName}`);

    return csvFile;
  }
}
