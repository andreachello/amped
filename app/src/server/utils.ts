import { getAddress } from 'viem'

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
