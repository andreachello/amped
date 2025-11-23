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
  // Use simple dataset naming like _/counter@dev for local development
  const datasetName = `_/${contractName.toLowerCase()}@dev`

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
      // Use defineDataset with eventTables to ensure all event tables are created
      // Read the ABI file and inline it to avoid import issues
      const abiFileContent = JSON.parse(fs.readFileSync(abiPath, 'utf-8'))
      // ABI is stored in the .abi property of the compiled JSON
      const abiArray = abiFileContent.abi || abiFileContent
      const abiJson = JSON.stringify(abiArray, null, 2)

      const ampConfigPath = path.join(projectRoot, 'amp.config.ts')
      const ampConfig = `import { defineDataset, eventTables } from '@edgeandnode/amp'

// ABI loaded from compiled contract
const abi = ${abiJson} as const

export default defineDataset(() => {
  const baseTables = eventTables(abi, 'anvil')

  return {
    namespace: '_',
    name: '${contractName.toLowerCase()}',
    network: 'anvil',
    description: 'Dataset for ${contractName} contract events',
    dependencies: {
      anvil: '_/anvil@0.0.1',
    },
    tables: {
      ...baseTables, // All event tables from the contract ABI - created automatically
    },
  }
})
`
      fs.writeFileSync(ampConfigPath, ampConfig, 'utf-8')
      console.log('✅ Updated amp.config.ts with eventTables - all event tables will be created on deployment')

      // Build new manifest with updated ABI
      const buildAmpOutput = execSync(`pnpm amp build -o ${manifestPath}`, {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 30000,
      })
      console.log('✅ Amp manifest built')
      ampOutput += buildAmpOutput

      // Register the manifest (without @dev version tag)
      const datasetBaseName = `_/${contractName.toLowerCase()}`
      const registerOutput = execSync(`pnpm ampctl dataset register ${datasetBaseName} ${manifestPath}`, {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 15000,
      })
      console.log(`✅ Amp dataset ${datasetBaseName} registered`)
      ampOutput += '\n' + registerOutput

      // Deploy the dataset (with @dev version tag - creates event tables)
      const deployAmpOutput = execSync(`pnpm ampctl dataset deploy ${datasetName}`, {
        cwd: projectRoot,
        encoding: 'utf-8',
        timeout: 30000,
      })
      console.log(`✅ Amp dataset ${datasetName} deployed`)
      ampOutput += '\n' + deployAmpOutput

      // CRITICAL: Copy manifest to datasets directory so Amp dev mode picks it up automatically
      // Amp dev mode watches the datasets directory for file changes
      // This ensures the dataset is available immediately without restarting Amp
      const datasetsDir = path.join(projectRoot, 'infra/amp/datasets')
      if (!fs.existsSync(datasetsDir)) {
        fs.mkdirSync(datasetsDir, { recursive: true })
      }

      // Copy manifest to datasets directory with a unique name
      // Amp dev mode will detect the new file and load the dataset
      const datasetFileName = `${contractName.toLowerCase()}-${timestamp}.json`
      const datasetFilePath = path.join(datasetsDir, datasetFileName)
      fs.copyFileSync(manifestPath, datasetFilePath)
      console.log(`✅ Manifest copied to datasets directory for auto-detection`)
      console.log(`   File: ${datasetFileName}`)
      console.log(`   Amp dev mode will automatically load this dataset (no restart needed)`)

      // Extract event names from ABI
      const events = abiArray.filter((item: any) => item.type === 'event')
      const eventNames = events.map((item: any) => item.name.toLowerCase())

      if (eventNames.length > 0) {
        console.log(`📋 Event tables defined for: ${eventNames.join(', ')}`)
        console.log(`   Amp dev mode should automatically pick up the new dataset`)
        console.log(`   Tables will be created when events are emitted or when first queried`)

        // Give Amp a moment to pick up the new dataset (dev mode watches for changes)
        // Then try to trigger table creation by querying them
        console.log(`   Waiting for Amp to register the dataset...`)
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay

        // Try to query each table to trigger creation (this will fail if table doesn't exist, but that's ok)
        // The tables will be created when the first event is emitted
        for (const event of events) {
          const tableName = event.name.toLowerCase()
          try {
            // Try a simple query - this will create the table structure if possible
            // Note: This might fail if table truly doesn't exist, which is expected
            execSync(`pnpm amp query 'SELECT COUNT(*) FROM "${datasetName}".${tableName}'`, {
              cwd: projectRoot,
              encoding: 'utf-8',
              timeout: 5000,
              stdio: 'ignore', // Suppress output - we're just trying to trigger creation
            })
            console.log(`   ✅ Table ${tableName} is ready`)
          } catch (queryError) {
            // Expected - table will be created when first event is emitted
            console.log(`   ⏳ Table ${tableName} will be created when ${event.name} event is emitted`)
          }
        }
      } else {
        console.log(`⚠️  No events found in ABI - no event tables will be created`)
      }
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
