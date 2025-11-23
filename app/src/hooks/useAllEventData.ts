import { useQuery } from '@tanstack/react-query'
import type { Abi, Address } from 'viem'
import { performAmpQuery, EVENTS_DATASET } from '../lib/runtime'
import { categorizeAbi } from '../lib/abiHelpers'
import { createAddressFilter } from '../lib/ampHelpers'

export function useAllEventData(contractAddress?: Address, contractAbi?: Abi) {
  const { data, isLoading } = useQuery({
    queryKey: ['AllEvents', contractAddress] as const,
    async queryFn() {
      if (!contractAbi || !contractAddress) return []

      const { events } = categorizeAbi(contractAbi)
      const allEventData: any[] = []

      // Fetch data from each event table
      for (const event of events) {
        try {
          const eventColumns = event.inputs?.map((input: any) => input.name || input.type) || []
          const allColumns = ['block_num', 'timestamp', ...eventColumns]
          const tableName = event.name.toLowerCase()
          const addressFilter = createAddressFilter(contractAddress)

          const query = `SELECT ${allColumns.join(', ')}
            FROM "${EVENTS_DATASET}".${tableName}
            ${addressFilter}
            ORDER BY block_num DESC
            LIMIT 100`

          const results = await performAmpQuery<Record<string, any>>(query)

          // Add event_type to each row so we can identify which event it came from
          const rowsWithType = results.map(row => ({
            ...row,
            event_type: event.name
          }))

          allEventData.push(...rowsWithType)
        } catch (error) {
          // Table doesn't exist yet - skip it
          console.log(`No data for event ${event.name} yet`)
        }
      }

      // Sort all events by block number descending
      return allEventData.sort((a, b) => (b.block_num || 0) - (a.block_num || 0))
    },
    enabled: !!contractAbi && !!contractAddress,
    retry: false,
    staleTime: 5000,
    gcTime: 10000,
  })

  return { data: data || [], isLoading }
}
