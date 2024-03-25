export enum PYTHON_ANALYZER_CODE_NAMES {
  SPLIT_BBL = "split-bbl.py",
  ANALYZE_ONE_FLIGHT = "analyze-one-flight.py",
}

export async function loadCode(
  name: PYTHON_ANALYZER_CODE_NAMES
): Promise<string> {
  // TODO: update build pipeline to insert code here
  let code: string | undefined;
  switch (name) {
    case PYTHON_ANALYZER_CODE_NAMES.SPLIT_BBL: {
      code = `${/* GEN_PY_CODE<split-bbl.py> */ ""}`.trim();
      break;
    }
    case PYTHON_ANALYZER_CODE_NAMES.ANALYZE_ONE_FLIGHT: {
      code = `${/* GEN_PY_CODE<analyze-one-flight.py> */ ""}`.trim();
      break;
    }
    default: {
      throw new Error(`Unknown code-placeholder name: ${name}`);
    }
  }

  if (code === undefined || code.trim() === "") {
    code = (await fetch(`./${name}`).then((response) =>
      response.text()
    )) as string;
  }

  return code;
}
