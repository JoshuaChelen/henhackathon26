import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { join } from 'node:path'
import { z } from 'zod'
import { runSmalltalkAnalysis } from './runner.js'

const app = express()

const port = Number(process.env.PORT || 4000)
const allowedOrigins = (
  process.env.FRONTEND_ORIGINS ||
  process.env.FRONTEND_ORIGIN ||
  'http://localhost:3000'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error(`Not allowed by CORS: ${origin}`))
    },
  }),
)
app.use(express.json({ limit: '10mb' }))

const potholeSchema = z.object({
  id: z.union([z.string(), z.number()]),
  image_url: z.string().optional().nullable(),
  date: z.string().optional().nullable(),
  severity: z.string().optional().nullable(),
  latitude: z.union([z.number(), z.string()]).optional().nullable(),
  longitude: z.union([z.number(), z.string()]).optional().nullable(),
  resolved_count: z.union([z.number(), z.string()]).optional().nullable(),
})

const requestSchema = z.object({
  potholes: z.array(potholeSchema),
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'pothole-smalltalk-backend' })
})

app.post('/analyze-potholes', async (req, res) => {
  const parsed = requestSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid payload',
      details: parsed.error.flatten(),
    })
  }

  const inputPath = join(process.cwd(), 'data', 'potholes.json')
  const outputPath = join(process.cwd(), 'data', 'pothole_analysis.json')

  try {
    const result = await runSmalltalkAnalysis({
      potholes: parsed.data.potholes,
      inputPath,
      outputPath,
    })

    return res.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Smalltalk execution failed'
    return res.status(500).json({ ok: false, error: message })
  }
})

app.listen(port, () => {
  console.log(`[smalltalk-backend] listening on http://localhost:${port}`)
})
