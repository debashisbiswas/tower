import os from "os";
import path from "path";

export namespace Config {
  export function notesDirectory() {
    return path.join(os.homedir(), ".tower");
  }
}
