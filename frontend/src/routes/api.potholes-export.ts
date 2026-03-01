import { createFileRoute } from '@tanstack/react-router'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
const runSmalltalkAnalysis = async (potholes: unknown[]) => {
  const backendUrl = process.env.SMALLTALK_BACKEND_URL || 'http://localhost:4000/analyze-potholes'

  const response = await fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ potholes }),
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      typeof result?.error === 'string'
        ? result.error
        : `Smalltalk backend request failed with status ${response.status}`,
    )
  }

  return {
    backendUrl,
    ...result,
  }
}

export const Route = createFileRoute('/api/potholes-export')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const potholes = Array.isArray(body?.potholes) ? body.potholes : []
          const nextJson = JSON.stringify(potholes, null, 2)

          const targetPath = join(process.cwd(), '..', 'potholes.json')
          await mkdir(dirname(targetPath), { recursive: true })

          let existingJson = ''
          try {
            existingJson = await readFile(targetPath, 'utf-8')
          } catch {
            existingJson = ''
          }

          if (existingJson !== nextJson) {
            await writeFile(targetPath, nextJson, 'utf-8')
          }

          const smalltalk = await runSmalltalkAnalysis(potholes)

          return Response.json({
            ok: true,
            path: targetPath,
            count: potholes.length,
            smalltalk,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to export potholes'
          return Response.json({ ok: false, error: message }, { status: 500 })
        }
      },
    },
  },
})
