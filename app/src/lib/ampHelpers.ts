import type { Address } from 'viem'

/**
 * Converts an Ethereum address to the format required for Amp queries.
 *
 * Amp stores addresses as FixedSizeBinary(20) (raw bytes), not strings.
 * To query them, we must use decode() with lowercase hex (no 0x prefix).
 *
 * @param address - The Ethereum address (with or without 0x prefix)
 * @returns Lowercase hex string without 0x prefix
 *
 * @example
 * formatAddressForAmpQuery('0x6F6B8249aC2D544cb3d5CB21fFfD582F8c7e9FE5')
 * // Returns: '6f6b8249ac2d544cb3d5cb21fffd582f8c7e9fe5'
 */
export function formatAddressForAmpQuery(address?: Address): string {
  if (!address) return ''
  return address.toLowerCase().replace('0x', '')
}

/**
 * Creates a WHERE clause for filtering by contract address in Amp queries.
 *
 * Uses the decode() function to convert hex to binary for comparison.
 * This is required because the address column is stored as FixedSizeBinary(20).
 *
 * @param address - The contract address to filter by
 * @returns SQL WHERE clause or empty string if no address provided
 *
 * @example
 * createAddressFilter('0x6F6B8249aC2D544cb3d5CB21fFfD582F8c7e9FE5')
 * // Returns: "WHERE address = decode('6f6b8249ac2d544cb3d5cb21fffd582f8c7e9fe5', 'hex')"
 */
export function createAddressFilter(address?: Address): string {
  if (!address) return ''
  const hexAddress = formatAddressForAmpQuery(address)
  return `WHERE address = decode('${hexAddress}', 'hex')`
}
