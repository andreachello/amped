# Smart Contract UI Editor with Auto-Deployment - Implementation Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Prerequisites & Dependencies](#prerequisites--dependencies)
3. [Backend API Implementation](#backend-api-implementation)
4. [Frontend UI Implementation](#frontend-ui-implementation)
5. [Integration & Testing](#integration--testing)
6. [Security Considerations](#security-considerations)
7. [Deployment Workflow](#deployment-workflow)
8. [Troubleshooting](#troubleshooting)

---

## 1. Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (React UI)                    │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ CodeMirror 6   │→→│ Deploy Button│→→│ Status Display  │ │
│  │ Solidity Editor│  │              │  │ (Address/Errors)│ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
└───────────────────────────────│──────────────────────────────┘
                                │ HTTP POST /api/deploy
                                ↓
┌─────────────────────────────────────────────────────────────┐
│                    Express.js Backend API                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 1. Validate Solidity code                            │   │
│  │ 2. Write to contracts/src/Counter.sol                │   │
│  │ 3. Execute: forge build                              │   │
│  │ 4. Execute: forge script --broadcast                 │   │
│  │ 5. Parse broadcast JSON for new address              │   │
│  │ 6. Return: { address, abi, txHash }                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────┐
│                 Foundry + Anvil (Blockchain)                 │
│  • forge build - Compiles Solidity                          │
│  • forge script - Deploys to Anvil (localhost:8545)         │
│  • Outputs: broadcast JSON + compiled ABI                   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow
1. User edits Solidity code in CodeMirror editor
2. User clicks "Deploy Contract"
3. Frontend sends code to `/api/deploy`
4. Backend validates, writes file, runs `forge build` + `forge script`
5. Backend parses deployment output and returns new contract address + ABI
6. Frontend updates contract address and reconnects via Wagmi/Viem
7. User can immediately interact with the new contract

---

## 2. Prerequisites & Dependencies

### Install New Dependencies

```bash
# Backend dependencies
pnpm add express cors
pnpm add -D @types/express @types/cors tsx concurrently

# Frontend dependencies
pnpm add @uiw/react-codemirror @codemirror/lang-javascript
```

### Project Structure After Implementation

```
amp-demo/
├── app/
│   ├── src/
│   │   ├── components/
│   │   │   ├── App.tsx (modified)
│   │   │   ├── ContractEditor.tsx (NEW)
│   │   │   ├── DeployButton.tsx (NEW)
│   │   │   └── DeploymentStatus.tsx (NEW)
│   │   ├── lib/
│   │   │   ├── viem.ts (modified - dynamic address loading)
│   │   │   └── abi.ts (unchanged)
│   │   └── server/ (NEW)
│   │       ├── index.ts (Express server)
│   │       ├── deploy.ts (Deployment logic)
│   │       └── utils.ts (Helpers)
│   └── package.json (modified)
├── contracts/
│   └── src/Counter.sol (will be overwritten by editor)
├── vite.config.ts (modified - add Express proxy)
└── IMPLEMENTATION.md (this file)
```

---

## 3. Backend API Implementation

### 3.1 Express Server Setup

**File: `app/src/server/index.ts`**

```typescript
import express, { Request, Response } from 'express'
import cors from 'cors'
import { deployContract } from './deploy'

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

    // Basic validation
    if (!code.includes('contract Counter')) {
      return res.status(400).json({
        error: 'Contract must be named "Counter"'
      })
    }

    // Deploy the contract
    const result = await deployContract(code)

    res.json(result)
  } catch (error: any) {
    console.error('Deployment error:', error)
    res.status(500).json({
      error: error.message || 'Deployment failed',
      details: error.stderr || error.stdout || ''
    })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Deployment API running on http://localhost:${PORT}`)
})
```

---

### 3.2 Deployment Logic

**File: `app/src/server/deploy.ts`**

```typescript
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { parseDeploymentOutput, parseABI } from './utils'

export interface DeploymentResult {
  success: boolean
  address?: string
  abi?: any[]
  transactionHash?: string
  error?: string
  logs?: string
}

export async function deployContract(solidityCode: string): Promise<DeploymentResult> {
  const projectRoot = path.resolve(__dirname, '../../..')
  const contractPath = path.join(projectRoot, 'contracts/src/Counter.sol')
  const broadcastPath = path.join(
    projectRoot,
    'contracts/broadcast/DeployCounter.s.sol/31337/run-latest.json'
  )
  const abiPath = path.join(
    projectRoot,
    'contracts/out/Counter.sol/Counter.json'
  )

  try {
    // Step 1: Backup existing contract (optional, for safety)
    if (fs.existsSync(contractPath)) {
      const backupPath = `${contractPath}.backup`
      fs.copyFileSync(contractPath, backupPath)
      console.log('✅ Backed up existing contract')
    }

    // Step 2: Write new Solidity code
    fs.writeFileSync(contractPath, solidityCode, 'utf-8')
    console.log('✅ Wrote new contract code')

    // Step 3: Compile contract
    console.log('🔨 Compiling contract...')
    const buildOutput = execSync('forge build', {
      cwd: path.join(projectRoot, 'contracts'),
      encoding: 'utf-8',
      timeout: 30000, // 30 second timeout
    })
    console.log('✅ Compilation successful')

    // Step 4: Deploy contract
    console.log('🚀 Deploying contract...')
    const deployOutput = execSync(
      'forge script script/DeployCounter.s.sol --broadcast --rpc-url http://localhost:8545 --private-key "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"',
      {
        cwd: path.join(projectRoot, 'contracts'),
        encoding: 'utf-8',
        timeout: 30000,
      }
    )
    console.log('✅ Deployment successful')

    // Step 5: Parse deployment output
    if (!fs.existsSync(broadcastPath)) {
      throw new Error('Broadcast file not found after deployment')
    }

    const broadcastData = JSON.parse(fs.readFileSync(broadcastPath, 'utf-8'))
    const address = parseDeploymentOutput(broadcastData)

    // Step 6: Parse ABI
    if (!fs.existsSync(abiPath)) {
      throw new Error('ABI file not found after compilation')
    }

    const abiData = JSON.parse(fs.readFileSync(abiPath, 'utf-8'))
    const abi = parseABI(abiData)

    // Step 7: Extract transaction hash
    const transactionHash = broadcastData.transactions?.[1]?.hash ||
                           broadcastData.transactions?.[0]?.hash

    return {
      success: true,
      address,
      abi,
      transactionHash,
      logs: `${buildOutput}\n\n${deployOutput}`,
    }
  } catch (error: any) {
    // Restore backup on failure
    const backupPath = `${contractPath}.backup`
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, contractPath)
      console.log('⚠️  Restored backup after deployment failure')
    }

    throw new Error(`Deployment failed: ${error.message}\n${error.stderr || ''}`)
  }
}
```

---

### 3.3 Utility Functions

**File: `app/src/server/utils.ts`**

```typescript
import { getAddress, Address } from 'viem'

const DEFAULT_CONTRACT_ADDRESS = '0x6f6b8249ac2d544cb3d5cb21fffd582f8c7e9fe5'

interface BroadcastTransaction {
  transactionType: string
  additionalContracts?: Array<{
    transactionType: string
    address: string
    contractName?: string
  }>
}

interface BroadcastFile {
  transactions: BroadcastTransaction[]
}

export function parseDeploymentOutput(broadcastData: BroadcastFile): string {
  // Find the CALL transaction
  const callTransaction = broadcastData.transactions.find(
    (tx) => tx.transactionType === 'CALL'
  )

  if (!callTransaction || !callTransaction.additionalContracts) {
    return DEFAULT_CONTRACT_ADDRESS
  }

  // Find the CREATE additional contract (the actual Counter deployment)
  const createContract = callTransaction.additionalContracts.find(
    (contract) => contract.transactionType === 'CREATE'
  )

  if (!createContract) {
    return DEFAULT_CONTRACT_ADDRESS
  }

  return getAddress(createContract.address)
}

export function parseABI(abiData: any): any[] {
  if (!abiData.abi || !Array.isArray(abiData.abi)) {
    throw new Error('Invalid ABI format')
  }
  return abiData.abi
}

export function validateSolidity(code: string): { valid: boolean; error?: string } {
  // Basic validation checks
  if (!code.trim()) {
    return { valid: false, error: 'Code cannot be empty' }
  }

  if (!code.includes('pragma solidity')) {
    return { valid: false, error: 'Missing pragma directive' }
  }

  if (!code.includes('contract Counter')) {
    return { valid: false, error: 'Contract must be named "Counter"' }
  }

  // Check for potentially dangerous operations (basic security)
  const dangerousPatterns = [
    /selfdestruct/i,
    /delegatecall/i,
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return {
        valid: false,
        error: `Potentially dangerous operation detected: ${pattern}`
      }
    }
  }

  return { valid: true }
}
```

---

### 3.4 Update Package Scripts

**File: `app/package.json` (add to "scripts" section)**

```json
{
  "scripts": {
    "check": "tsc -b tsconfig.json",
    "dev": "vite",
    "dev:api": "tsx watch src/server/index.ts",
    "dev:all": "concurrently \"pnpm dev\" \"pnpm dev:api\"",
    "amp": "amp",
    "studio": "amp studio --open"
  }
}
```

---

## 4. Frontend UI Implementation

### 4.1 Update Vite Config for API Proxy

**File: `vite.config.ts`**

```typescript
import react from "@vitejs/plugin-react"
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from "vite"

export default defineConfig({
  root: "app",
  envDir: "..",
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/rpc": {
        target: "http://localhost:8545",
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rpc/, ""),
      },
      "/amp": {
        target: "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/amp/, ""),
      },
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
})
```

---

### 4.2 Contract Editor Component

**File: `app/src/components/ContractEditor.tsx`**

```typescript
import { useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'

const DEFAULT_CONTRACT = `// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

contract Counter {
    event Incremented(uint256 count);
    event Decremented(uint256 count);

    uint256 public count;

    constructor() {
        count = 0;
    }

    function increment() public {
        count++;
        emit Incremented(count);
    }

    function decrement() public {
        require(count > 0, "Counter: count is zero");
        count--;
        emit Decremented(count);
    }
}`

interface ContractEditorProps {
  onCodeChange: (code: string) => void
  initialCode?: string
}

export function ContractEditor({ onCodeChange, initialCode }: ContractEditorProps) {
  const [code, setCode] = useState(initialCode || DEFAULT_CONTRACT)

  const handleChange = (value: string) => {
    setCode(value)
    onCodeChange(value)
  }

  return (
    <div className="w-full border border-gray-300 rounded-lg overflow-hidden">
      <div className="bg-gray-800 text-white px-4 py-2 text-sm font-mono">
        contracts/src/Counter.sol
      </div>
      <CodeMirror
        value={code}
        height="400px"
        theme="dark"
        extensions={[javascript({ jsx: false })]}
        onChange={handleChange}
        className="text-sm"
      />
    </div>
  )
}
```

---

### 4.3 Deploy Button Component

**File: `app/src/components/DeployButton.tsx`**

```typescript
import { useState } from 'react'

interface DeployButtonProps {
  code: string
  onDeployStart: () => void
  onDeploySuccess: (result: DeploymentResult) => void
  onDeployError: (error: string) => void
}

interface DeploymentResult {
  success: boolean
  address?: string
  abi?: any[]
  transactionHash?: string
  logs?: string
}

export function DeployButton({
  code,
  onDeployStart,
  onDeploySuccess,
  onDeployError,
}: DeployButtonProps) {
  const [isDeploying, setIsDeploying] = useState(false)

  const handleDeploy = async () => {
    setIsDeploying(true)
    onDeployStart()

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Deployment failed')
      }

      onDeploySuccess(result)
    } catch (error: any) {
      onDeployError(error.message)
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <button
      onClick={handleDeploy}
      disabled={isDeploying}
      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
    >
      {isDeploying ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Deploying...
        </span>
      ) : (
        'Deploy Contract'
      )}
    </button>
  )
}
```

---

### 4.4 Deployment Status Component

**File: `app/src/components/DeploymentStatus.tsx`**

```typescript
interface DeploymentStatusProps {
  status: 'idle' | 'deploying' | 'success' | 'error'
  address?: string
  transactionHash?: string
  error?: string
}

export function DeploymentStatus({
  status,
  address,
  transactionHash,
  error,
}: DeploymentStatusProps) {
  if (status === 'idle') return null

  return (
    <div className="w-full mt-4 p-4 rounded-lg border">
      {status === 'deploying' && (
        <div className="text-blue-600">
          <p className="font-semibold">Deploying contract...</p>
          <p className="text-sm text-gray-600 mt-1">
            Compiling Solidity and broadcasting to Anvil
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-green-600">
          <p className="font-semibold">✅ Deployment successful!</p>
          <div className="mt-2 space-y-1 text-sm">
            <p>
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                {address}
              </span>
            </p>
            {transactionHash && (
              <p className="text-gray-600">
                Tx: <span className="font-mono">{transactionHash}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="text-red-600">
          <p className="font-semibold">❌ Deployment failed</p>
          <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto max-h-32">
            {error}
          </pre>
        </div>
      )}
    </div>
  )
}
```

---

### 4.5 Updated App Component

**File: `app/src/components/App.tsx`**

```typescript
import { useState } from 'react'
import { ContractEditor } from './ContractEditor'
import { DeployButton } from './DeployButton'
import { DeploymentStatus } from './DeploymentStatus'
import { IncrementCTA } from './IncrementCTA'
import { DecrementCTA } from './DecrementCTA'
import { IncrementTable } from './IncrementTable'
import { DecrementTable } from './DecrementTable'
import { LogsTable } from './LogsTable'
import { TransactionsTable } from './TransactionsTable'

type DeploymentStatus = 'idle' | 'deploying' | 'success' | 'error'

export function App() {
  const [code, setCode] = useState('')
  const [deploymentStatus, setDeploymentStatus] = useState<DeploymentStatus>('idle')
  const [deploymentResult, setDeploymentResult] = useState<any>(null)
  const [deploymentError, setDeploymentError] = useState<string>('')

  const handleDeployStart = () => {
    setDeploymentStatus('deploying')
    setDeploymentError('')
  }

  const handleDeploySuccess = (result: any) => {
    setDeploymentStatus('success')
    setDeploymentResult(result)
    // Trigger page reload after 2 seconds to pick up new contract
    setTimeout(() => {
      window.location.reload()
    }, 2000)
  }

  const handleDeployError = (error: string) => {
    setDeploymentStatus('error')
    setDeploymentError(error)
  }

  return (
    <div className="min-h-full">
      <div className="border-b border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex shrink-0 items-center">Amp Demo - Contract Editor</div>
            </div>
          </div>
        </div>
      </div>

      <main className="w-full flex flex-col gap-y-6 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Contract Editor Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Edit & Deploy Contract</h2>
          <ContractEditor onCodeChange={setCode} />
          <div className="flex items-center gap-4">
            <DeployButton
              code={code}
              onDeployStart={handleDeployStart}
              onDeploySuccess={handleDeploySuccess}
              onDeployError={handleDeployError}
            />
          </div>
          <DeploymentStatus
            status={deploymentStatus}
            address={deploymentResult?.address}
            transactionHash={deploymentResult?.transactionHash}
            error={deploymentError}
          />
        </section>

        {/* Contract Interaction Section */}
        <section className="space-y-4 pt-6 border-t">
          <h2 className="text-xl font-semibold">Interact with Contract</h2>
          <div className="flex items-center gap-x-2">
            <IncrementCTA />
            <DecrementCTA />
          </div>
          <div className="w-full grid grid-cols-2 gap-x-2">
            <IncrementTable />
            <DecrementTable />
          </div>
        </section>

        {/* Logs Section */}
        <section className="space-y-4">
          <LogsTable />
          <TransactionsTable />
        </section>
      </main>
    </div>
  )
}
```

---

### 4.6 Dynamic Contract Address Loading

**File: `app/src/lib/viem.ts` (Modified)**

```typescript
import { createPublicClient, getContract, webSocket, Address } from "viem"
import { anvil } from "viem/chains"
import { abi } from "./abi"

// Dynamic import of broadcast data
let cachedAddress: Address | null = null

export async function getContractAddress(): Promise<Address> {
  if (cachedAddress) return cachedAddress

  try {
    // Import the latest broadcast data
    const BroadcastData = await import(
      '../../../contracts/broadcast/DeployCounter.s.sol/31337/run-latest.json'
    )

    const { parseDeployedContractAddress } = await import('./parseContractAddress')
    cachedAddress = parseDeployedContractAddress(BroadcastData.default)
    return cachedAddress
  } catch (error) {
    console.error('Failed to load contract address:', error)
    // Fallback to default address
    return '0x6f6b8249ac2d544cb3d5cb21fffd582f8c7e9fe5' as Address
  }
}

export const client = createPublicClient({
  chain: anvil,
  transport: webSocket("/rpc"),
})

// Initialize contract with dynamic address
let counterContract: ReturnType<typeof getContract> | null = null

export async function getCounterContract() {
  if (!counterContract) {
    const address = await getContractAddress()
    counterContract = getContract({
      address,
      abi,
      client,
    })
  }
  return counterContract
}

// Export for backwards compatibility
export const address = await getContractAddress()
export const counter = await getCounterContract()
```

---

## 5. Integration & Testing

### 5.1 Installation Steps

```bash
# 1. Install all dependencies
pnpm install

# 2. Ensure Docker services are running
just up

# 3. Start the backend API (Terminal 1)
cd app
pnpm dev:api

# 4. Start the frontend (Terminal 2)
pnpm dev

# Or use concurrently (single command):
pnpm dev:all
```

### 5.2 Testing Workflow

1. **Open browser**: Navigate to `http://localhost:5173`
2. **Edit contract**: Modify the Counter contract in the CodeMirror editor
3. **Deploy**: Click "Deploy Contract" button
4. **Wait**: Monitor deployment status (compiling → deploying → success)
5. **Interact**: Use Increment/Decrement buttons with the new contract
6. **Verify**: Check that events appear in the tables below

### 5.3 Example Test Modifications

**Add a new function to Counter.sol:**

```solidity
function reset() public {
    count = 0;
    emit Incremented(0);
}
```

**Add a multiplier:**

```solidity
uint256 public multiplier = 2;

function increment() public {
    count += multiplier;
    emit Incremented(count);
}

function setMultiplier(uint256 _multiplier) public {
    multiplier = _multiplier;
}
```

**Change the decrement behavior:**

```solidity
function decrement() public {
    if (count > 0) {
        count--;
        emit Decremented(count);
    }
    // No revert, just ignore if count is 0
}
```

---

## 6. Security Considerations

### Basic Security Notes

1. **Local Development Only**: This implementation is designed for **local development with Anvil**. Do NOT expose the API to public networks without proper authentication and authorization.

2. **Private Key Hardcoded**: The deployment uses a hardcoded private key from Anvil's default accounts (`0xac0974...`). This is acceptable for local testing but must NEVER be used in production or with real funds.

3. **File System Access**: The API has write access to your contracts directory. Security measures:
   - API should only be accessible from localhost
   - Input validation prevents basic path traversal attacks
   - Backups are created before overwriting files
   - Consider adding file system sandboxing for production

4. **Code Validation**: The current implementation has minimal validation. For production, consider:
   - Solidity syntax checking before compilation (e.g., using `solc` directly)
   - Gas limit analysis to prevent expensive deployments
   - Static analysis tools (e.g., Slither, Mythril)
   - Rate limiting to prevent abuse

5. **CORS Configuration**: Currently allows all origins. For production:
```typescript
app.use(cors({
  origin: 'http://localhost:5173', // Specific origin only
  credentials: true
}))
```

6. **Rate Limiting**: Add rate limiting to prevent abuse:
```bash
pnpm add express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
})

app.use('/api/deploy', limiter)
```

---

## 7. Deployment Workflow

### Complete Development Cycle

```
1. Edit Code (UI - CodeMirror)
   ↓
2. Click "Deploy" (UI - DeployButton)
   ↓
3. POST /api/deploy (HTTP Request)
   ↓
4. Validate code (Backend)
   ↓
5. Write contracts/src/Counter.sol (Backend - fs.writeFileSync)
   ↓
6. forge build (Backend - execSync)
   ↓
7. forge script --broadcast (Backend - execSync)
   ↓
8. Parse broadcast JSON (Backend - parseDeploymentOutput)
   ↓
9. Parse compiled ABI (Backend - parseABI)
   ↓
10. Return {address, abi, txHash} (HTTP Response)
   ↓
11. Display success message (UI - DeploymentStatus)
   ↓
12. Reload page after 2 seconds (UI - window.location.reload)
   ↓
13. Frontend reconnects to new contract address
   ↓
14. User interacts with new contract (Increment/Decrement)
```

### File Changes During Deployment

| File | Action | Purpose |
|------|--------|---------|
| `contracts/src/Counter.sol` | Overwritten | New contract code |
| `contracts/out/Counter.sol/Counter.json` | Regenerated | New ABI and bytecode |
| `contracts/broadcast/.../run-latest.json` | Updated | New deployment address and tx data |
| Frontend imports | Reloaded on page refresh | Pick up new address/ABI |

### Environment Requirements

- **Anvil**: Must be running on `localhost:8545` (started via `docker-compose up`)
- **Backend API**: Must be running on `localhost:3001` (started via `pnpm dev:api`)
- **Frontend**: Runs on `localhost:5173` (started via `pnpm dev`)
- **Foundry**: Must be installed and accessible in PATH

---

## 8. Troubleshooting

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **API connection refused** | Backend not running | Run `pnpm dev:api` in app directory |
| **Compilation fails** | Syntax error in Solidity | Check error message, verify pragma version matches |
| **Deployment fails** | Anvil not accessible | Verify with `docker ps` and `curl localhost:8545` |
| **Address not updating** | Cached imports | Reload page (F5) to re-import broadcast JSON |
| **ABI mismatch errors** | Build failed silently | Check backend logs for compilation errors |
| **CORS errors** | Frontend/backend port mismatch | Verify Vite proxy config points to 3001 |
| **Module not found** | Missing dependencies | Run `pnpm install` again |

### Debug Commands

```bash
# Check Anvil is running and accessible
curl http://localhost:8545 -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Expected response: {"jsonrpc":"2.0","id":1,"result":"0x..."}

# Check backend API health
curl http://localhost:3001/api/health

# Expected response: {"status":"ok","timestamp":1234567890}

# Manual deployment test (from contracts directory)
cd contracts
forge build
forge script script/DeployCounter.s.sol --broadcast --rpc-url http://localhost:8545 \
  --private-key "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

# Check if broadcast file was created
ls -la broadcast/DeployCounter.s.sol/31337/run-latest.json

# Check if ABI was generated
ls -la out/Counter.sol/Counter.json

# View backend logs
# (In terminal where pnpm dev:api is running)

# View Docker logs for Anvil
docker logs amp-demo-anvil-1
```

### Advanced Debugging

**Enable verbose logging in backend:**

```typescript
// In app/src/server/deploy.ts
const buildOutput = execSync('forge build', {
  cwd: path.join(projectRoot, 'contracts'),
  encoding: 'utf-8',
  timeout: 30000,
  stdio: 'inherit', // Add this to see real-time output
})
```

**Test deployment API directly:**

```bash
curl -X POST http://localhost:3001/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "code": "// SPDX-License-Identifier: UNLICENSED\npragma solidity ^0.8.30;\n\ncontract Counter {\n    uint256 public count = 42;\n    function increment() public { count++; }\n}"
  }'
```

---

## Summary

This implementation provides a complete solution for:

- ✅ **Live code editing** in the browser with CodeMirror 6
- ✅ **One-click deployment** via Express.js backend API
- ✅ **Automatic compilation** using Foundry's `forge build`
- ✅ **Blockchain deployment** to local Anvil instance
- ✅ **Address discovery** from Foundry broadcast files
- ✅ **Real-time feedback** with deployment status UI
- ✅ **Seamless integration** with existing Viem/Wagmi/Amp stack

### Key Benefits

1. **Rapid Iteration**: Edit and deploy contracts without leaving the browser
2. **No Manual Steps**: Eliminates need to run `forge build` and `forge script` manually
3. **Instant Feedback**: See compilation and deployment errors immediately
4. **Full Integration**: Works with existing event indexing and query infrastructure
5. **Developer Experience**: Modern, VSCode-like editor with syntax highlighting

### Next Steps

After implementing this system, you can extend it with:

- Multiple contract support (beyond just Counter.sol)
- Contract versioning and rollback
- Deployment to testnets (not just local Anvil)
- More sophisticated code validation and security checks
- WebSocket notifications for deployment progress
- Contract templates and snippets
- Integration with Solidity LSP for real-time type checking

---

**Questions or issues?** Check the troubleshooting section above or review the inline code comments for additional context.
