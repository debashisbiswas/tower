import { exit } from "process"
import { Note } from "./note"
import { Config } from "./config"

const subcommands = ["new", "add", "ls", "search", "rm", "sync", "auth"]
const subcommand = Bun.argv[2]

if (subcommand === undefined) {
  console.log("subcommand required, use one of:", subcommands.join(", "))
  exit(1)
}

function formatNotePreview(id: string, content: string) {
  const trimmed = content.trim()
  const firstLine = trimmed.split("\n")[0] || ""
  const preview = firstLine.slice(0, 80)
  return `${id}\t${preview}${trimmed.length > 80 ? "..." : ""}`
}

const notesDir = Config.notesDirectory()

switch (subcommand) {
  case "new":
    const createResult = await Note.create(notesDir)
    if (!createResult.success) {
      console.log("file empty, deleting...")
    }
    break

  case "add":
    const content = Bun.argv[3]

    if (!content) {
      console.log("content is required")
      exit(1)
    }

    const noteId = await Note.add(content, notesDir)
    console.log(`created note ${noteId}`)
    break

  case "ls":
    const notes = await Note.listNotes(notesDir)
    if (notes.length === 0) {
      console.log("no notes found")
    } else {
      notes.forEach((note) => console.log(formatNotePreview(note.id, note.content)))
    }
    break

  case "search":
    const query = Bun.argv[3]

    if (!query) {
      console.log("search query is required")
      exit(1)
    }

    const searchResults = await Note.search(query, notesDir)
    if (searchResults.length === 0) {
      console.log("no notes found")
    } else {
      searchResults.forEach((note) => console.log(formatNotePreview(note.id, note.content)))
    }
    break

  case "rm":
    const noteIdToRemove = Bun.argv[3]

    if (!noteIdToRemove) {
      console.log("note id is required")
      exit(1)
    }

    const removeResult = await Note.remove(noteIdToRemove, notesDir)
    if (removeResult.success) {
      console.log(`deleted note ${noteIdToRemove}`)
    } else {
      console.log(`note ${noteIdToRemove} not found`)
    }
    break

  default:
    console.log(`invalid subcommand "${subcommand}", use one of:`, subcommands.join(", "))
    break
}
