import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { parseDeploymentOutput, parseABI } from './utils.js'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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
