import { test, expect, beforeEach, afterEach } from "bun:test"
import { Note } from "./note"
import fs from "fs"
import path from "path"
import os from "os"

const testDir = path.join(os.tmpdir(), "tower-test")

beforeEach(() => {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true })
  }
  fs.mkdirSync(testDir, { recursive: true })
})

afterEach(() => {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true })
  }
})

test("Note.add() creates note with given content", async () => {
  const content = "This is a test note"
  const timestamp = 1234567890123

  const noteId = await Note.add(content, testDir, timestamp)

  expect(noteId).toBe("1234567890123")
  const filePath = path.join(testDir, "1234567890123.txt")
  expect(fs.existsSync(filePath)).toBe(true)

  const savedContent = await Bun.file(filePath).text()
  expect(savedContent).toBe(content)
})

test("Note.add() uses current timestamp when not provided", async () => {
  const content = "Test note"
  const beforeTime = Date.now()

  const noteId = await Note.add(content, testDir)

  const afterTime = Date.now()
  const timestamp = parseInt(noteId)
  expect(timestamp).toBeGreaterThanOrEqual(beforeTime)
  expect(timestamp).toBeLessThanOrEqual(afterTime)

  const filePath = path.join(testDir, `${noteId}.txt`)
  expect(fs.existsSync(filePath)).toBe(true)
})

test("Note.listNotes() returns empty array when no notes exist", async () => {
  const notes = await Note.listNotes(testDir)

  expect(notes).toEqual([])
})

test("Note.listNotes() returns notes sorted by timestamp (newest first)", async () => {
  await Note.add("First note", testDir, 1000000000000)
  await Note.add("Second note", testDir, 2000000000000)

  const notes = await Note.listNotes(testDir)

  expect(notes).toEqual([
    { id: "2000000000000", content: "Second note" },
    { id: "1000000000000", content: "First note" },
  ])
})

test("Note.remove() deletes existing note and returns success", async () => {
  await Note.add("Test note", testDir, 1000000000000)
  const filePath = path.join(testDir, "1000000000000.txt")
  expect(fs.existsSync(filePath)).toBe(true)

  const result = await Note.remove("1000000000000", testDir)

  expect(result).toEqual({ success: true })
  expect(fs.existsSync(filePath)).toBe(false)
})

test("Note.remove() returns error for non-existent note", async () => {
  const result = await Note.remove("nonexistent", testDir)

  expect(result).toEqual({ success: false, error: "not_found" })
})

test("Note.create() with editor that writes content", async () => {
  const timestamp = 1234567890123
  const mockEditor = async (filePath: string) => {
    await Bun.file(filePath).write("Editor content")
  }

  const result = await Note.create(testDir, {
    timestamp,
    editor: mockEditor,
  })

  expect(result).toEqual({ success: true, noteId: "1234567890123" })
  const filePath = path.join(testDir, "1234567890123.txt")
  expect(fs.existsSync(filePath)).toBe(true)

  const content = await Bun.file(filePath).text()
  expect(content).toBe("Editor content")
})

test("Note.create() deletes empty file and returns failure", async () => {
  const timestamp = 1234567890123
  const mockEditor = async () => {}

  const result = await Note.create(testDir, {
    timestamp,
    editor: mockEditor,
  })

  expect(result).toEqual({ success: false })
  const filePath = path.join(testDir, "1234567890123.txt")
  expect(fs.existsSync(filePath)).toBe(false)
})

test("Note.search() finds notes containing query", async () => {
  await Note.add("This is about cats", testDir, 1000000000000)
  await Note.add("This is about dogs", testDir, 2000000000000)
  await Note.add("Random note", testDir, 3000000000000)

  const results = await Note.search("cats", testDir)

  expect(results).toEqual([{ id: "1000000000000", content: "This is about cats" }])
})

test("Note.search() is case insensitive", async () => {
  await Note.add("This is about CATS", testDir, 1000000000000)

  const results = await Note.search("cats", testDir)

  expect(results).toEqual([{ id: "1000000000000", content: "This is about CATS" }])
})

test("Note.search() returns empty array when no matches", async () => {
  await Note.add("This is about dogs", testDir, 1000000000000)

  const results = await Note.search("cats", testDir)

  expect(results).toEqual([])
})
