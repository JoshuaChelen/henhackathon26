import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
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

const readFirstParsableJson = async (paths) => {
  for (const path of paths) {
    try {
      const raw = await readFile(path, 'utf-8')
      const parsed = safeJsonParse(raw)
      if (parsed.value !== null) {
        return { analysis: parsed.value, sourcePath: path, parseError: null }
      }
      return {
        analysis: null,
        sourcePath: path,
        parseError: `Failed to parse ${path}: ${parsed.error}`,
      }
    } catch {
      // Try next candidate path
    }
  }

  return { analysis: null, sourcePath: null, parseError: null }
}

const toFiniteNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const buildNodeFallbackAnalysis = (potholes) => {
  const rows = Array.isArray(potholes) ? potholes : []

  const severityCounts = {}
  const resolvedValues = []
  const lats = []
  const lons = []

  const topCandidates = rows.map((row) => {
    const severity = typeof row?.severity === 'string' ? row.severity : 'unknown'
    const resolved = toFiniteNumber(row?.resolved_count) ?? 0
    const lat = toFiniteNumber(row?.latitude)
    const lon = toFiniteNumber(row?.longitude)

    severityCounts[severity] = (severityCounts[severity] || 0) + 1
    resolvedValues.push(resolved)
    if (lat !== null) lats.push(lat)
    if (lon !== null) lons.push(lon)

    return {
      id: row?.id ?? null,
      severity,
      resolvedReports: resolved,
      latitude: lat,
      longitude: lon,
    }
  })

  let mostCommonSeverity = null
  let maxSeverityCount = -1
  Object.entries(severityCounts).forEach(([severity, count]) => {
    if (count > maxSeverityCount) {
      maxSeverityCount = count
      mostCommonSeverity = severity
    }
  })

  const totalResolved = resolvedValues.reduce((sum, value) => sum + value, 0)
  const averageResolvedReports = resolvedValues.length ? totalResolved / resolvedValues.length : 0
  const maxResolvedReports = resolvedValues.length ? Math.max(...resolvedValues) : 0

  const top5ByResolvedReports = topCandidates
    .sort((a, b) => b.resolvedReports - a.resolvedReports)
    .slice(0, 5)

  return {
    count: rows.length,
    severityCounts,
    mostCommonSeverity,
    averageResolvedReports,
    maxResolvedReports,
    boundingBox: {
      minLat: lats.length ? Math.min(...lats) : null,
      maxLat: lats.length ? Math.max(...lats) : null,
      minLon: lons.length ? Math.min(...lons) : null,
      maxLon: lons.length ? Math.max(...lons) : null,
    },
    top5ByResolvedReports,
  }
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

  const outputCandidates = [
    outputPath,
    resolve(outputPath),
    join(process.cwd(), 'data', 'pothole_analysis.json'),
    resolve(process.cwd(), 'data', 'pothole_analysis.json'),
  ]

  const outputReadResult = await readFirstParsableJson(outputCandidates)
  if (outputReadResult.analysis !== null) {
    analysis = outputReadResult.analysis
    analysisSource = outputReadResult.sourcePath === outputPath ? 'output-file' : 'alternate-output-file'
    analysisParseError = null
  } else if (outputReadResult.parseError) {
    analysisParseError = outputReadResult.parseError
  } else {
    analysisParseError = `Failed to read ${outputPath}: output file not found in expected locations`
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

  if (analysis === null) {
    analysis = buildNodeFallbackAnalysis(potholes)
    analysisSource = 'node-fallback'
    analysisParseError = `${analysisParseError ? `${analysisParseError} | ` : ''}Used Node fallback analysis because Smalltalk output was unavailable.`
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
