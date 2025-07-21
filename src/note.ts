import fs from "fs"
import { Config } from "./config"
import path from "path"

async function openInEditor(file: string) {
  // TODO: why doesn't Bun.openInEditor work?
  const editor = process.env.EDITOR || "vi"
  const proc = Bun.spawn([editor, file], {
    stdio: ["inherit", "inherit", "inherit"],
  })
  await proc.exited
}

export namespace Note {
  export async function create() {
    const newFilePath = path.join(Config.notesDirectory(), `${Date.now()}.txt`)

    const newFile = Bun.file(newFilePath)
    newFile.write("")
    await openInEditor(newFilePath)
    const content = await newFile.text()
    const trimmed = content.trim()

    if (trimmed === "") {
      console.log("file empty, deleting...")
      fs.unlinkSync(newFilePath)
    }
  }

  export async function list() {
    const filePaths = fs.globSync(path.join(Config.notesDirectory(), "*.txt"))

    if (filePaths.length === 0) {
      console.log("no notes found")
      return
    }

    // Sort by timestamp in filename (newest first)
    const sortedPaths = filePaths.sort((a, b) => {
      const aId = parseInt(path.basename(a, ".txt"))
      const bId = parseInt(path.basename(b, ".txt"))
      return bId - aId
    })

    for (const filePath of sortedPaths) {
      const id = path.basename(filePath, ".txt")
      const content = await Bun.file(filePath).text()
      const trimmed = content.trim()
      const firstLine = trimmed.split("\n")[0] || ""
      const preview = firstLine.slice(0, 80)
      console.log(`${id}\t${preview}${trimmed.length > 80 ? "..." : ""}`)
    }
  }

  export async function remove(noteId: string) {
    const noteFilePath = path.join(Config.notesDirectory(), `${noteId}.txt`)

    if (!fs.existsSync(noteFilePath)) {
      console.log(`note ${noteId} not found`)
      return
    }

    fs.unlinkSync(noteFilePath)
    console.log(`deleted note ${noteId}`)
  }
}
