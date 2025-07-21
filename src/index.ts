import { exit } from "process";
import { Note } from "./note";

const subcommands = ["new", "ls", "rm", "sync", "auth"];
const subcommand = Bun.argv[2];

if (subcommand === undefined) {
  console.log("subcommand required, use one of:", subcommands.join(", "));
  exit(1);
}

switch (subcommand) {
  case "new":
    await Note.create();
    break;

  case "ls":
    await Note.list();
    break;

  case "rm":
    const noteId = Bun.argv[3];

    if (!noteId) {
      console.log("note id is required");
      exit(1);
    }

    await Note.remove(noteId);
    break;

  default:
    console.log(
      `invalid subcommand "${subcommand}", use one of:`,
      subcommands.join(", "),
    );
    break;
}
