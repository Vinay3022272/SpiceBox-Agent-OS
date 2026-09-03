import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const WIKI_RUNNER_URLS = [
  process.env.WIKI_RUNNER_URL || "http://host.docker.internal:8002",
  "http://172.17.0.1:8002",
  "http://localhost:8002",
]

async function callRunner(path: string, options: RequestInit = {}) {
  let lastError: any = null
  for (const baseUrl of WIKI_RUNNER_URLS) {
    try {
      const url = `${baseUrl}${path}`
      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      })
      const data = await res.json()
      return { ok: res.ok, status: res.status, data }
    } catch (err: any) {
      lastError = err
    }
  }
  throw new Error(`Could not connect to Wiki Runner on any URL (${WIKI_RUNNER_URLS.join(", ")}): ${lastError?.message || lastError}`)
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const result = await callRunner("/status")
    res.status(result.status).json(result.data)
  } catch (err: any) {
    res.status(503).json({
      status: "unavailable",
      message: err.message,
      page_count: 0,
    })
  }
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const body = req.body || {}
  try {
    const result = await callRunner("/generate", {
      method: "POST",
      body: JSON.stringify(body),
    })
    res.status(result.status).json(result.data)
  } catch (err: any) {
    res.status(503).json({
      success: false,
      message: err.message,
    })
  }
}
