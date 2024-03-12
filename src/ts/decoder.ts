declare global {
  interface Window {
    BlackboxDecodeModule: any;
  }
}

export class Decoder {
  private readonly fileOrigin: string;
  private BlackboxDecodeModule?: any;

  public constructor(fileOrigin: string) {
    console.log("initiating decoder with fileOrigin", fileOrigin)
    this.fileOrigin = fileOrigin;
  }

  // function to dynamically load the pydide module if not present
  private async load() {
    if (!this.BlackboxDecodeModule) {
      if (!window.BlackboxDecodeModule) {
        await this.loadScriptTag();
      }

      console.log("awaiting module", window.BlackboxDecodeModule);
      this.BlackboxDecodeModule = await window.BlackboxDecodeModule;
    }

    return this.BlackboxDecodeModule;
  }

  // function to load the pyodide module
  private async loadScriptTag() {
    console.log("adding decoder script tag");
    const moduleUrl = `${this.fileOrigin}/blackbox_decode.js`;

    const sctiptTag = document.createElement("script");
    sctiptTag.src = moduleUrl;
    document.body.appendChild(sctiptTag);

    await new Promise((resolve) => {
      sctiptTag.onload = resolve;
    });

    console.log("decoder module loaded", window.BlackboxDecodeModule);
  }

  public async decodeBlackbox(blackbox: File) {
    console.log("loading blackbox decoder module");
    const blackboxDecodeModule = await this.load();
    blackboxDecodeModule.FS.writeFile("/logfile.bbl", blackbox);
    console.log("calling decoder main()");
    const result = blackboxDecodeModule.ccall('main', 'number', ["string"], ["/logfile.bbl"]);
  }
}
