import fs from "fs"
import path from "path"

async function waitForEditor(file: string) {
  const editor = process.env.EDITOR || "vi"
  const proc = Bun.spawn([editor, file], {
    stdio: ["inherit", "inherit", "inherit"],
  })
  return proc.exited
}

export namespace Note {
  export async function add(
    notesDir: string,
    options?: {
      content?: string
      timestamp?: number
    },
  ) {
    const timestamp = options?.timestamp ?? Date.now()
    const filePath = path.join(notesDir, `${timestamp}.txt`)

    if (options?.content) {
      await Bun.file(filePath).write(options.content)
      return { success: true, noteId: timestamp.toString() }
    } else {
      await Bun.file(filePath).write("")
      await waitForEditor(filePath)
      const content = await Bun.file(filePath).text()
      const trimmed = content.trim()

      if (trimmed === "") {
        fs.unlinkSync(filePath)
        return { success: false }
      }

      return { success: true, noteId: timestamp.toString() }
    }
  }

  export async function listNotes(notesDir: string) {
    const filePaths = fs.globSync(path.join(notesDir, "*.txt"))

    const sortedPaths = filePaths.sort((a, b) => {
      const aId = parseInt(path.basename(a, ".txt"))
      const bId = parseInt(path.basename(b, ".txt"))
      return bId - aId
    })

    const notes: Array<{ id: string; content: string }> = []
    for (const filePath of sortedPaths) {
      const id = path.basename(filePath, ".txt")
      const content = await Bun.file(filePath).text()
      notes.push({ id, content })
    }

    return notes
  }

  export async function remove(noteId: string, notesDir: string) {
    const noteFilePath = path.join(notesDir, `${noteId}.txt`)

    if (!fs.existsSync(noteFilePath)) {
      return { success: false, error: "not_found" }
    }

    fs.unlinkSync(noteFilePath)
    return { success: true }
  }

  export async function search(query: string, notesDir: string) {
    const notes = await listNotes(notesDir)
    return notes.filter((note) => note.content.toLowerCase().includes(query.toLowerCase()))
  }
}
