import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { performAmpQuery, RPC_SOURCE } from '../lib/runtime'
import { formatAddressForAmpQuery } from '../lib/ampHelpers'

export interface ContractInteraction {
  address: string
  count: string
  first_block: string
  last_block: string
}

export function useContractInteractions(walletAddress?: Address) {
  return useQuery({
    queryKey: ['ContractInteractions', walletAddress] as const,
    async queryFn() {
      if (!walletAddress) throw new Error('Wallet address required')

      const hexAddress = formatAddressForAmpQuery(walletAddress)

      try {
        const query = `SELECT
           address,
           COUNT(*) as count,
           MIN(block_num) as first_block,
           MAX(block_num) as last_block
         FROM "${RPC_SOURCE}".logs
         WHERE tx_hash IN (
           SELECT tx_hash FROM "${RPC_SOURCE}".transactions
           WHERE "from" = decode('${hexAddress}', 'hex')
         )
         GROUP BY address
         ORDER BY count DESC
         LIMIT 20`

        console.log('[useContractInteractions] Query:', query)
        const interactions = await performAmpQuery<ContractInteraction>(query)
        console.log('[useContractInteractions] Results:', interactions?.length || 0, 'contracts')

        return interactions || []
      } catch (error) {
        console.error('[useContractInteractions] Error fetching contract interactions:', error)
        return []
      }
    },
    enabled: !!walletAddress,
    staleTime: 5000,
    gcTime: 10000,
  })
}
