import { useQuery } from '@tanstack/react-query'
import type { Abi, Address } from 'viem'
import { performAmpQuery, EVENTS_DATASET } from '../lib/runtime'
import { categorizeAbi } from '../lib/abiHelpers'
import { createAddressFilter, eventNameToTableName, paramNameToColumnName } from '../lib/ampHelpers'

export function useAllEventData(contractAddress?: Address, contractAbi?: Abi, datasetName?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['AllEvents', contractAddress, datasetName] as const,
    async queryFn() {
      if (!contractAbi || !contractAddress) return []

      const { events } = categorizeAbi(contractAbi)
      const allEventData: any[] = []

      // Fetch data from each event table
      for (const event of events) {
        try {
          // Amp converts parameter names to snake_case (e.g., "newValue" -> "new_value")
          const eventColumns = event.inputs?.map((input: any) => {
            if (input.name) {
              return paramNameToColumnName(input.name)
            }
            // If no name, use the type (but this shouldn't happen with proper ABIs)
            return input.type.toLowerCase().replace(/[^a-z0-9]/g, '_')
          }) || []
          const allColumns = ['block_num', 'timestamp', ...eventColumns]
          // Amp's eventTables uses snake_case for table names
          const tableName = eventNameToTableName(event.name)
          const addressFilter = createAddressFilter(contractAddress)

          const query = `SELECT ${allColumns.join(', ')}
            FROM "${datasetName || EVENTS_DATASET}".${tableName}
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
