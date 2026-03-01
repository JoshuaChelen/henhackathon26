import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

const buildCommand = (template, inputPath, outputPath) =>
  template
    .replaceAll('{input}', `"${inputPath}"`)
    .replaceAll('{output}', `"${outputPath}"`)

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
  try {
    const raw = await readFile(outputPath, 'utf-8')
    analysis = JSON.parse(raw)
  } catch {
    analysis = null
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
  }
}
