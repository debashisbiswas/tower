import { exit } from "process"
import { Note } from "./note"
import { Config } from "./config"
import { Auth } from "./auth"

const subcommands = ["add", "ls", "search", "rm", "sync", "auth", "logout", "whoami"]
const subcommand = Bun.argv[2]

if (subcommand === undefined) {
  console.log("Tower - A local-first note-taking CLI")
  console.log("")
  console.log("Usage: tower <command>")
  console.log("")
  console.log("Commands:")
  console.log('  add [-m "message"]  Create a new note')
  console.log("  ls                   List all notes")
  console.log("  search <query>       Search notes by content")
  console.log("  rm <note-id>         Delete a note")
  console.log("  auth                 Login or register")
  console.log("  logout               Logout and clear stored auth")
  console.log("  whoami               Show current user")
  console.log("")
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
  case "add":
    const messageFlag = Bun.argv[3]

    if (messageFlag === "-m") {
      const messageArgs = Bun.argv.slice(4)

      if (messageArgs.length === 0) {
        console.log("message content is required after -m")
        exit(1)
      }

      const content = messageArgs.join(" ")
      const result = await Note.add(notesDir, { content })
      if (result.success) {
        console.log(`created note ${result.noteId}`)
      }
    } else {
      const result = await Note.add(notesDir)
      if (!result.success) {
        console.log("file empty, deleting...")
      }
    }
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

  case "auth":
    try {
      process.stdout.write("Username: ")
      const username = (await new Promise((resolve) => {
        process.stdin.once("data", (data) => resolve(data.toString().trim()))
      })) as string

      process.stdout.write("Password: ")
      const password = (await new Promise((resolve) => {
        process.stdin.once("data", (data) => resolve(data.toString().trim()))
      })) as string

      try {
        await Auth.login(username, password)
        console.log(`Logged in as ${username}`)
      } catch (error) {
        console.log(`Login failed: ${error instanceof Error ? error.message : "Unknown error"}`)
        console.log("Would you like to register instead? (y/n)")
        process.stdout.write("> ")
        const shouldRegister = (await new Promise((resolve) => {
          process.stdin.once("data", (data) => resolve(data.toString().trim().toLowerCase()))
        })) as string

        if (shouldRegister === "y" || shouldRegister === "yes") {
          await Auth.register(username, password)
          console.log(`Registered and logged in as ${username}`)
        } else {
          console.log("Authentication cancelled")
          exit(1)
        }
      }
    } catch (error) {
      console.log(`Authentication error: ${error instanceof Error ? error.message : "Unknown error"}`)
      exit(1)
    }
    break

  case "logout":
    try {
      await Auth.logout()
      console.log("Logged out successfully")
    } catch (error) {
      console.log(`Logout error: ${error instanceof Error ? error.message : "Unknown error"}`)
      exit(1)
    }
    break

  case "whoami":
    try {
      const user = await Auth.getCurrentUser()
      if (user) {
        console.log(`Logged in as ${user}`)
      } else {
        console.log("Not logged in")
      }
    } catch (error) {
      console.log(`Error checking auth status: ${error instanceof Error ? error.message : "Unknown error"}`)
      exit(1)
    }
    break

  default:
    console.log(`Unknown command: ${subcommand}`)
    console.log("")
    console.log("Available commands:", subcommands.join(", "))
    console.log("Run 'tower' without arguments for help")
    exit(1)
}
