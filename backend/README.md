# Smalltalk Analysis Backend

Simple backend service that receives pothole data, writes `data/potholes.json`, executes a Smalltalk command, and returns/stores analysis results.

## 1) Install

```bash
cd backend
npm install
```

## 2) Configure

Copy `.env.example` to `.env` and set your Smalltalk command:

```bash
cp .env.example .env
```

Set `SMALLTALK_ANALYSIS_COMMAND` in `.env`.

The command supports placeholders:
- `{input}`: path to generated pothole JSON
- `{output}`: path where your Smalltalk script should write analysis JSON

## 3) Run

```bash
npm run dev
```

Server runs on `http://localhost:4000` by default.

## 3b) Run with Docker

Build image:

```bash
docker build -t pothole-smalltalk-backend ./backend
```

Run container:

```bash
docker run --rm -p 4000:4000 \
  -e PORT=4000 \
  -e FRONTEND_ORIGIN=http://localhost:3000 \
  -e SMALLTALK_ANALYSIS_COMMAND="<your command with {input} and {output}>" \
  pothole-smalltalk-backend
```

If your Smalltalk runtime binary/script is outside the image, either:
- bake it into a custom image based on this Dockerfile, or
- mount it as a volume and reference that mounted path in `SMALLTALK_ANALYSIS_COMMAND`.

## 4) API

### Health

`GET /health`

### Analyze potholes

`POST /analyze-potholes`

Body:

```json
{
  "potholes": [
    {
      "id": "abc",
      "severity": "high",
      "latitude": 39.68,
      "longitude": -75.74,
      "resolved_count": 2
    }
  ]
}
```

Response includes:
- execution status
- command output (`stdout`, `stderr`)
- parsed analysis (if your Smalltalk script writes valid JSON to `{output}`)

## 5) Frontend integration idea

From your frontend export step, POST fetched potholes to:

`http://localhost:4000/analyze-potholes`

This keeps Smalltalk execution in backend/runtime (production-safe), not browser.
