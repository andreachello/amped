import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { parseDeploymentOutput, parseABI } from './utils.js'
import { generateDeploymentScript } from './deploymentScriptTemplate.js'
import { generateDatasetName, contractNameToFilename } from '../lib/contractNameExtractor.js'

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
  contractName?: string
  datasetName?: string
}

export async function deployContract(solidityCode: string, contractName: string): Promise<DeploymentResult> {
  const projectRoot = path.resolve(__dirname, '../../..')
  const timestamp = Date.now()
  const contractFilename = contractNameToFilename(contractName)
  const datasetName = generateDatasetName(contractName, timestamp)

  // Dynamic paths based on contract name
  const contractPath = path.join(projectRoot, `contracts/src/${contractFilename}`)
  const deployScriptPath = path.join(projectRoot, `contracts/script/Deploy${contractName}.s.sol`)
  const broadcastPath = path.join(
    projectRoot,
    `contracts/broadcast/Deploy${contractName}.s.sol/31337/run-latest.json`
  )
  const abiPath = path.join(
    projectRoot,
    `contracts/out/${contractFilename}/${contractName}.json`
  )

  try {
    // Step 1: Generate and write deployment script
    const deployScript = generateDeploymentScript(contractName)
    fs.writeFileSync(deployScriptPath, deployScript, 'utf-8')
    console.log(`✅ Generated deployment script for ${contractName}`)

    // Step 2: Backup existing contract (optional, for safety)
    if (fs.existsSync(contractPath)) {
      const backupPath = `${contractPath}.backup`
      fs.copyFileSync(contractPath, backupPath)
      console.log('✅ Backed up existing contract')
    }

    // Step 3: Write new Solidity code
    fs.writeFileSync(contractPath, solidityCode, 'utf-8')
    console.log(`✅ Wrote ${contractName} contract code`)

    // Step 4: Compile contract
    console.log(`🔨 Compiling ${contractName}...`)
    const buildOutput = execSync('forge build', {
      cwd: path.join(projectRoot, 'contracts'),
      encoding: 'utf-8',
      timeout: 30000, // 30 second timeout
    })
    console.log('✅ Compilation successful')

    // Step 5: Deploy contract
    console.log(`🚀 Deploying ${contractName}...`)
    const deployOutput = execSync(
      `forge script script/Deploy${contractName}.s.sol --broadcast --rpc-url http://localhost:8545 --private-key "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"`,
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

    // Step 8: Build and register Amp dataset with unique name
    // This creates typed tables for all events for this specific contract deployment
    console.log(`📊 Building Amp dataset ${datasetName}...`)
    let ampOutput = ''
    try {
      const manifestPath = `/tmp/amp-${contractName.toLowerCase()}-${timestamp}-manifest.json`

      // First, update amp.config.ts with the new contract
      const ampConfigPath = path.join(projectRoot, 'amp.config.ts')
      const ampConfig = `import type { AmpConfig } from '@edgeandnode/amp'

const config: AmpConfig = {
  contracts: [
    {
      abiFile: './contracts/out/${contractFilename}/${contractName}.json',
    }
  ],
  sources: {
    '${contractName}_${timestamp}': 'anvil',
  },
  namespace: 'eth_global',
  name: '${contractName.toLowerCase()}_${timestamp}'
}

export default config
`
      fs.writeFileSync(ampConfigPath, ampConfig, 'utf-8')
      console.log('✅ Updated amp.config.ts')

      // Build new manifest with updated ABI
      const buildAmpOutput = execSync(`pnpm amp build -o ${manifestPath}`, {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 30000,
      })
      console.log('✅ Amp manifest built')
      ampOutput += buildAmpOutput

      // Register the manifest with unique dataset name
      const registerOutput = execSync(`pnpm ampctl dataset register ${datasetName} ${manifestPath}`, {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 15000,
      })
      console.log(`✅ Amp dataset ${datasetName} registered`)
      ampOutput += '\n' + registerOutput

      // Deploy the dataset (creates event tables)
      const deployAmpOutput = execSync(`pnpm ampctl dataset deploy ${datasetName}`, {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 30000,
      })
      console.log(`✅ Amp dataset ${datasetName} deployed - event tables created`)
      ampOutput += '\n' + deployAmpOutput
    } catch (ampError: any) {
      console.warn('⚠️  Failed to build/register Amp dataset:', ampError.message)
      // Don't fail the deployment if Amp update fails
      // The contract deployment itself was successful
      ampOutput += '\n' + (ampError.stderr || ampError.message)
    }

    return {
      success: true,
      address,
      abi,
      transactionHash,
      contractName,
      datasetName,
      logs: `${buildOutput}\n\n${deployOutput}\n\n${ampOutput}`,
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
