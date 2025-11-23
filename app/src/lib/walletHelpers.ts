import type { Address } from 'viem'

/**
 * Truncates a wallet address for display
 * Example: 0x1234567890abcdef -> 0x1234...cdef
 */
export function formatWalletAddress(address: Address, startChars = 6, endChars = 4): string {
  if (address.length <= startChars + endChars) return address
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

/**
 * Checks if a transaction is received by the wallet
 */
export function isReceivedTransaction(tx: { to: string; from: string }, walletAddress: Address): boolean {
  const normalizedTo = tx.to.toLowerCase().replace('0x', '')
  const normalizedWallet = walletAddress.toLowerCase().replace('0x', '')
  return normalizedTo === normalizedWallet
}

/**
 * Gets the transaction type label
 */
export function getTransactionType(tx: { to: string; from: string }, walletAddress: Address): 'Sent' | 'Received' | 'Contract Interaction' {
  const isReceived = isReceivedTransaction(tx, walletAddress)

  // Check if it's a contract creation (to address is empty)
  if (!tx.to || tx.to === '0x' || tx.to === '0x0000000000000000000000000000000000000000') {
    return 'Contract Interaction'
  }

  return isReceived ? 'Received' : 'Sent'
}

/**
 * Formats gas usage with commas
 * Example: 21000 -> "21,000"
 */
export function formatGasUsage(gas: number | string): string {
  const num = typeof gas === 'string' ? parseInt(gas, 10) : gas
  return num.toLocaleString()
}

/**
 * Formats large numbers with K, M suffixes
 * Example: 1500 -> "1.5K", 1500000 -> "1.5M"
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * Common Anvil test accounts
 */
export const ANVIL_ACCOUNTS: Address[] = [
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // Account #0
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // Account #1
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // Account #2
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906', // Account #3
  '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', // Account #4
  '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', // Account #5
  '0x976EA74026E726554dB657fA54763abd0C3a0aa9', // Account #6
  '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955', // Account #7
  '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f', // Account #8
  '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720', // Account #9
]

/**
 * Gets a label for known Anvil accounts
 */
export function getAccountLabel(address: Address): string | null {
  const index = ANVIL_ACCOUNTS.findIndex(acc => acc.toLowerCase() === address.toLowerCase())
  return index >= 0 ? `Account #${index}` : null
}
