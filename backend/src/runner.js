import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

const buildCommand = (template, inputPath, outputPath) =>
  template
    .replaceAll('{input}', `"${inputPath}"`)
    .replaceAll('{output}', `"${outputPath}"`)

const normalizeJsonText = (raw) => raw.replace(/^\uFEFF/, '').trim()

const safeJsonParse = (raw) => {
  try {
    return { value: JSON.parse(normalizeJsonText(raw)), error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown JSON parse error'
    return { value: null, error: message }
  }
}

const extractMarkedJson = (text) => {
  if (!text) return null
  const marker = 'ANALYSIS_JSON:'
  const markerIndex = text.lastIndexOf(marker)
  if (markerIndex === -1) return null
  const afterMarker = text.slice(markerIndex + marker.length).trim()
  if (!afterMarker) return null
  const firstLine = afterMarker.split(/\r?\n/)[0]
  return firstLine || null
}

export const runSmalltalkAnalysis = async ({ potholes, inputPath, outputPath }) => {
  const commandTemplate = process.env.SMALLTALK_ANALYSIS_COMMAND

  await mkdir(dirname(inputPath), { recursive: true })
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(inputPath, JSON.stringify(potholes, null, 2), 'utf-8')

  if (!commandTemplate) {
    return {
      ok: false,
      executed: false,
      reason:
        'SMALLTALK_ANALYSIS_COMMAND is not configured. Add it to backend/.env to run Smalltalk analysis.',
      inputPath,
      outputPath,
    }
  }

  const command = buildCommand(commandTemplate, inputPath, outputPath)

  const { stdout, stderr } = await execAsync(command, {
    cwd: process.cwd(),
    env: process.env,
  })

  let analysis = null
  let analysisSource = null
  let analysisParseError = null

  try {
    const raw = await readFile(outputPath, 'utf-8')
    const parsed = safeJsonParse(raw)
    if (parsed.value !== null) {
      analysis = parsed.value
      analysisSource = 'output-file'
    } else {
      analysisParseError = `Failed to parse ${outputPath}: ${parsed.error}`
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown file read error'
    analysisParseError = `Failed to read ${outputPath}: ${message}`
  }

  if (analysis === null) {
    const markedStdout = extractMarkedJson(stdout)
    const markedStderr = extractMarkedJson(stderr)
    const markedPayload = markedStdout ?? markedStderr

    if (markedPayload) {
      const parsedMarker = safeJsonParse(markedPayload)
      if (parsedMarker.value !== null) {
        analysis = parsedMarker.value
        analysisSource = markedStdout ? 'stdout-marker' : 'stderr-marker'
        analysisParseError = null
      } else {
        analysisParseError = `${analysisParseError ? `${analysisParseError} | ` : ''}Failed to parse marker JSON: ${parsedMarker.error}`
      }
    }
  }

  return {
    ok: true,
    executed: true,
    command,
    inputPath,
    outputPath,
    stdout,
    stderr,
    analysis,
    analysisSource,
    analysisParseError,
  }
}
