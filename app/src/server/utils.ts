import { getAddress } from 'viem'
import { validateContractExists } from '../lib/contractNameExtractor'

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
    throw new Error('Failed to find deployment transaction in broadcast data')
  }

  // Find the CREATE additional contract (the actual Counter deployment)
  const createContract = callTransaction.additionalContracts.find(
    (contract) => contract.transactionType === 'CREATE'
  )

  if (!createContract) {
    throw new Error('Failed to find CREATE contract in broadcast data')
  }

  return getAddress(createContract.address)
}

export function parseABI(abiData: any): any[] {
  if (!abiData.abi || !Array.isArray(abiData.abi)) {
    throw new Error('Invalid ABI format')
  }
  return abiData.abi
}

export function validateSolidity(code: string): { valid: boolean; error?: string; contractName?: string } {
  // Basic validation checks
  if (!code.trim()) {
    return { valid: false, error: 'Code cannot be empty' }
  }

  if (!code.includes('pragma solidity')) {
    return { valid: false, error: 'Missing pragma directive' }
  }

  // Validate contract exists and extract name
  const contractValidation = validateContractExists(code)
  if (!contractValidation.valid) {
    return { valid: false, error: contractValidation.error }
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

  return { valid: true, contractName: contractValidation.contractName! }
}
