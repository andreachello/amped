import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { performAmpQuery, RPC_SOURCE } from '../lib/runtime'
import { formatAddressForAmpQuery } from '../lib/ampHelpers'

export interface TimelineDataPoint {
  block_num: string
  tx_count: string
}

export function useWalletActivityTimeline(walletAddress?: Address) {
  return useQuery({
    queryKey: ['WalletActivityTimeline', walletAddress] as const,
    async queryFn() {
      if (!walletAddress) throw new Error('Wallet address required')

      const hexAddress = formatAddressForAmpQuery(walletAddress)

      try {
        const query = `SELECT
           block_num,
           COUNT(*) as tx_count
         FROM "${RPC_SOURCE}".transactions
         WHERE "from" = decode('${hexAddress}', 'hex')
         GROUP BY block_num
         ORDER BY block_num ASC
         LIMIT 100`

        console.log('[useWalletActivityTimeline] Query:', query)
        const timeline = await performAmpQuery<TimelineDataPoint>(query)
        console.log('[useWalletActivityTimeline] Results:', timeline?.length || 0, 'data points')

        return timeline || []
      } catch (error) {
        console.error('[useWalletActivityTimeline] Error fetching activity timeline:', error)
        return []
      }
    },
    enabled: !!walletAddress,
    staleTime: 5000,
    gcTime: 10000,
  })
}
