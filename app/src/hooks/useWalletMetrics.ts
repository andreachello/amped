import { useQuery } from '@tanstack/react-query'
import type { Address } from 'viem'
import { performAmpQuery, RPC_SOURCE } from '../lib/runtime'
import { formatAddressForAmpQuery } from '../lib/ampHelpers'

interface WalletMetrics {
  txCount: number
  contractsInteracted: number
  totalGasSent: number
  recentActivity: number
}

export function useWalletMetrics(walletAddress?: Address) {
  return useQuery({
    queryKey: ['WalletMetrics', walletAddress] as const,
    async queryFn() {
      if (!walletAddress) throw new Error('Wallet address required')

      const hexAddress = formatAddressForAmpQuery(walletAddress)
      console.log('[useWalletMetrics] walletAddress:', walletAddress)
      console.log('[useWalletMetrics] hexAddress:', hexAddress)

      // Initialize metrics with defaults
      const metrics: WalletMetrics = {
        txCount: 0,
        contractsInteracted: 0,
        totalGasSent: 0,
        recentActivity: 0,
      }

      try {
        // Query 1: Total transactions sent
        const query1 = `SELECT COUNT(*) as total FROM "${RPC_SOURCE}".transactions WHERE "from" = decode('${hexAddress}', 'hex')`
        console.log('[useWalletMetrics] Query 1:', query1)
        const txCountResult = await performAmpQuery<{ total: string }>(query1)
        console.log('[useWalletMetrics] txCountResult:', txCountResult)
        metrics.txCount = parseInt(txCountResult?.[0]?.total || '0')
      } catch (error) {
        console.error('[useWalletMetrics] Query 1 failed:', error)
      }

      try {
        // Query 2: Unique contracts interacted with (skip due to subquery issues)
        // This query uses a subquery which causes ArrowFlightError
        // We'll leave it at 0 for now
        console.log('[useWalletMetrics] Query 2: Skipped (subquery not supported)')
        metrics.contractsInteracted = 0
      } catch (error) {
        console.error('[useWalletMetrics] Query 2 failed:', error)
      }

      try {
        // Query 3: Recent activity (last 10 blocks as proxy for 24h in local testnet)
        const query3 = `SELECT MAX(block_num) as max_block FROM "${RPC_SOURCE}".transactions`
        console.log('[useWalletMetrics] Query 3:', query3)
        const recentBlockQuery = await performAmpQuery<{ max_block: string }>(query3)
        console.log('[useWalletMetrics] recentBlockQuery:', recentBlockQuery)

        const maxBlock = recentBlockQuery?.[0]?.max_block ? parseInt(recentBlockQuery[0].max_block) : 0
        const cutoffBlock = Math.max(0, maxBlock - 10)

        const query4 = `SELECT COUNT(*) as total FROM "${RPC_SOURCE}".transactions
         WHERE "from" = decode('${hexAddress}', 'hex') AND block_num > ${cutoffBlock}`
        console.log('[useWalletMetrics] Query 4:', query4)
        const recentActivityResult = await performAmpQuery<{ total: string }>(query4)
        console.log('[useWalletMetrics] recentActivityResult:', recentActivityResult)
        metrics.recentActivity = parseInt(recentActivityResult?.[0]?.total || '0')
      } catch (error) {
        console.error('[useWalletMetrics] Query 3/4 failed:', error)
      }

      console.log('[useWalletMetrics] Final metrics:', metrics)
      return metrics
    },
    enabled: !!walletAddress,
    staleTime: 5000,
    gcTime: 10000,
  })
}
