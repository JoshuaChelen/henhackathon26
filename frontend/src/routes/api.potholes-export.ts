import { createFileRoute } from '@tanstack/react-router'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const getErrorDetails = (error: unknown) => {
  if (error instanceof Error) {
    const cause =
      typeof (error as Error & { cause?: unknown }).cause === 'object'
        ? JSON.stringify((error as Error & { cause?: unknown }).cause)
        : String((error as Error & { cause?: unknown }).cause ?? '')

    return {
      message: error.message,
      name: error.name,
      cause,
      stack: error.stack,
    }
  }

  return {
    message: 'Unknown error',
    name: 'UnknownError',
    cause: String(error),
    stack: undefined,
  }
}

const runSmalltalkAnalysis = async (potholes: unknown[]) => {
  const backendUrl = process.env.SMALLTALK_BACKEND_URL || 'http://localhost:4000/analyze-potholes'

  let response: Response
  try {
    response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ potholes }),
    })
  } catch (error) {
    const details = getErrorDetails(error)
    throw new Error(
      `Failed to reach Smalltalk backend at ${backendUrl}. ${details.message}${details.cause ? ` | cause: ${details.cause}` : ''}`,
    )
  }

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
          const backendUrl = process.env.SMALLTALK_BACKEND_URL || 'http://localhost:4000/analyze-potholes'

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
            backendUrl,
            smalltalk,
          })
        } catch (error) {
          const details = getErrorDetails(error)
          return Response.json(
            {
              ok: false,
              error: details.message,
              details,
              hint:
                'Set SMALLTALK_BACKEND_URL in frontend server env to your deployed backend endpoint, e.g. http://143.198.21.236:4000/analyze-potholes',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
