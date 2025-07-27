import fs from "fs"
import path from "path"

async function openInEditor(file: string) {
  const editor = process.env.EDITOR || "vi"
  const proc = Bun.spawn([editor, file], {
    stdio: ["inherit", "inherit", "inherit"],
  })
  await proc.exited
}

export namespace Note {
  export async function add(content: string, notesDir: string, timestamp?: number) {
    const noteTimestamp = timestamp ?? Date.now()
    const filePath = path.join(notesDir, `${noteTimestamp}.txt`)
    await Bun.file(filePath).write(content)
    return noteTimestamp.toString()
  }

  export async function create(
    notesDir: string,
    options?: {
      timestamp?: number
      editor?: (path: string) => Promise<void>
    },
  ) {
    const timestamp = options?.timestamp ?? Date.now()
    const editor = options?.editor ?? openInEditor
    const newFilePath = path.join(notesDir, `${timestamp}.txt`)

    const newFile = Bun.file(newFilePath)
    await newFile.write("")
    await editor(newFilePath)
    const content = await newFile.text()
    const trimmed = content.trim()

    if (trimmed === "") {
      fs.unlinkSync(newFilePath)
      return { success: false }
    }

    return { success: true, noteId: timestamp.toString() }
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
