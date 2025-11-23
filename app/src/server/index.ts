import express, { Request, Response } from 'express'
import cors from 'cors'
import { deployContract } from './deploy.js'
import { performAmpQuery } from './ampClient.js'
import { validateSolidity } from './utils.js'

const app = express()
const PORT = 3001

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// Deploy endpoint
app.post('/api/deploy', async (req: Request, res: Response) => {
  try {
    const { code } = req.body

    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "code" parameter'
      })
    }

    // Validate contract code
    const validation = validateSolidity(code)
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error
      })
    }

    // Deploy the contract
    const result = await deployContract(code, validation.contractName!)

    res.json(result)
  } catch (error: any) {
    console.error('Deployment error:', error)
    res.status(500).json({
      error: error.message || 'Deployment failed',
      details: error.stderr || error.stdout || ''
    })
  }
})

// SQL Query endpoint
app.post('/api/query', async (req: Request, res: Response) => {
  try {
    const { query } = req.body

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "query" parameter'
      })
    }

    // Execute the Amp query
    const results = await performAmpQuery(query)

    res.json({
      success: true,
      results,
      count: results.length
    })
  } catch (error: any) {
    console.error('Query error:', error)
    res.status(500).json({
      error: error.message || 'Query failed',
      details: error.toString()
    })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Deployment API running on http://localhost:${PORT}`)
})
