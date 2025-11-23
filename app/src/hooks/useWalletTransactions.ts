import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { performAmpQuery, RPC_SOURCE } from '../lib/runtime'
import { formatAddressForAmpQuery } from '../lib/ampHelpers'

export interface WalletTransaction {
  block_num: string
  timestamp: number
  tx_hash: string
  to: string
  from: string
  nonce: number
}

const ITEMS_PER_PAGE = 10

export function useWalletTransactions(walletAddress?: Address, page: number = 0) {
  return useQuery({
    queryKey: ['WalletTransactions', walletAddress, page] as const,
    async queryFn() {
      if (!walletAddress) throw new Error('Wallet address required')

      const hexAddress = formatAddressForAmpQuery(walletAddress)
      const offset = page * ITEMS_PER_PAGE

      try {
        const query = `SELECT block_num, timestamp, tx_hash, "to", "from", nonce
         FROM "${RPC_SOURCE}".transactions
         WHERE "from" = decode('${hexAddress}', 'hex') OR "to" = decode('${hexAddress}', 'hex')
         ORDER BY block_num DESC
         LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}`

        console.log('[useWalletTransactions] Query:', query)
        const transactions = await performAmpQuery<WalletTransaction>(query)
        console.log('[useWalletTransactions] Results:', transactions?.length || 0, 'transactions')

        return transactions || []
      } catch (error) {
        console.error('[useWalletTransactions] Error fetching transactions:', error)
        return []
      }
    },
    enabled: !!walletAddress,
    staleTime: 5000,
    gcTime: 10000,
  })
}
