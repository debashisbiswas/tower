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

  const result = await Note.add(testDir, { content, timestamp })

  expect(result).toEqual({ success: true, noteId: "1234567890123" })
  const filePath = path.join(testDir, "1234567890123.txt")
  expect(fs.existsSync(filePath)).toBe(true)

  const savedContent = await Bun.file(filePath).text()
  expect(savedContent).toBe(content)
})

test("Note.add() uses current timestamp when not provided", async () => {
  const content = "Test note"
  const beforeTime = Date.now()

  const result = await Note.add(testDir, { content })

  const afterTime = Date.now()
  expect(result.success).toBe(true)
  const timestamp = parseInt(result.noteId!)
  expect(timestamp).toBeGreaterThanOrEqual(beforeTime)
  expect(timestamp).toBeLessThanOrEqual(afterTime)

  const filePath = path.join(testDir, `${result.noteId}.txt`)
  expect(fs.existsSync(filePath)).toBe(true)
})

test("Note.listNotes() returns empty array when no notes exist", async () => {
  const notes = await Note.listNotes(testDir)

  expect(notes).toEqual([])
})

test("Note.listNotes() returns notes sorted by timestamp (newest first)", async () => {
  await Note.add(testDir, { content: "First note", timestamp: 1000000000000 })
  await Note.add(testDir, { content: "Second note", timestamp: 2000000000000 })

  const notes = await Note.listNotes(testDir)

  expect(notes).toEqual([
    { id: "2000000000000", content: "Second note" },
    { id: "1000000000000", content: "First note" },
  ])
})

test("Note.remove() deletes existing note and returns success", async () => {
  await Note.add(testDir, { content: "Test note", timestamp: 1000000000000 })
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

test("Note.search() finds notes containing query", async () => {
  await Note.add(testDir, { content: "This is about cats", timestamp: 1000000000000 })
  await Note.add(testDir, { content: "This is about dogs", timestamp: 2000000000000 })
  await Note.add(testDir, { content: "Random note", timestamp: 3000000000000 })

  const results = await Note.search("cats", testDir)

  expect(results).toEqual([{ id: "1000000000000", content: "This is about cats" }])
})

test("Note.search() is case insensitive", async () => {
  await Note.add(testDir, { content: "This is about CATS", timestamp: 1000000000000 })

  const results = await Note.search("cats", testDir)

  expect(results).toEqual([{ id: "1000000000000", content: "This is about CATS" }])
})

test("Note.search() returns empty array when no matches", async () => {
  await Note.add(testDir, { content: "This is about dogs", timestamp: 1000000000000 })

  const results = await Note.search("cats", testDir)

  expect(results).toEqual([])
})
