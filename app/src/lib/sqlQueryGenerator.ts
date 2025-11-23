import type { Abi } from 'viem'
import { categorizeAbi } from './abiHelpers'

export interface GeneratedQuery {
  name: string
  description: string
  query: string
}

/**
 * Generates example SQL queries based on a contract's ABI events
 */
export function generateEventQueries(
  contractAbi: Abi,
  datasetName: string,
  contractAddress?: string
): GeneratedQuery[] {
  const { events } = categorizeAbi(contractAbi)

  if (events.length === 0) {
    return []
  }

  const queries: GeneratedQuery[] = []

  // Generate a query for each event type
  events.forEach((event: any) => {
    const eventName = event.name
    const tableName = eventName.toLowerCase()

    // Get event parameters
    const eventColumns = event.inputs?.map((input: any) => input.name || input.type) || []
    const allColumns = ['block_num', 'timestamp', ...eventColumns]

    // Address filter clause
    const addressFilter = contractAddress
      ? `WHERE address = decode('${contractAddress.toLowerCase().replace('0x', '')}', 'hex')`
      : ''

    // Query 1: Recent events of this type
    queries.push({
      name: `Recent ${eventName} events`,
      description: `Get the most recent ${eventName} events from the contract`,
      query: `SELECT ${allColumns.join(', ')}
FROM "${datasetName}".${tableName}
${addressFilter}
ORDER BY block_num DESC
LIMIT 10`
    })

    // Query 2: Count of this event type
    if (eventColumns.length > 0) {
      const firstColumn = eventColumns[0]
      queries.push({
        name: `${eventName} by ${firstColumn}`,
        description: `Group ${eventName} events by ${firstColumn}`,
        query: `SELECT ${firstColumn}, COUNT(*) as count
FROM "${datasetName}".${tableName}
${addressFilter}
GROUP BY ${firstColumn}
ORDER BY count DESC
LIMIT 10`
      })
    }
  })

  // Query 3: Event counts summary (if multiple event types)
  if (events.length > 1) {
    const unionQueries = events.map((event: any) => {
      const tableName = event.name.toLowerCase()
      const addressFilter = contractAddress
        ? `WHERE address = decode('${contractAddress.toLowerCase().replace('0x', '')}', 'hex')`
        : ''

      return `SELECT '${event.name}' as event_type, COUNT(*) as count
FROM "${datasetName}".${tableName}
${addressFilter}`
    }).join('\nUNION ALL\n')

    queries.push({
      name: 'Event counts by type',
      description: 'Summary of all event types emitted by this contract',
      query: unionQueries
    })
  }

  // Query 4: Timeline query (events over time)
  const firstEvent = events[0]
  const firstTableName = firstEvent.name.toLowerCase()
  const addressFilter = contractAddress
    ? `WHERE address = decode('${contractAddress.toLowerCase().replace('0x', '')}', 'hex')`
    : ''

  queries.push({
    name: 'Event timeline',
    description: 'Events over time with timestamps',
    query: `SELECT block_num, timestamp, COUNT(*) as event_count
FROM "${datasetName}".${firstTableName}
${addressFilter}
GROUP BY block_num, timestamp
ORDER BY block_num DESC
LIMIT 20`
  })

  return queries
}

/**
 * Generates example graph queries optimized for visualization
 */
export function generateGraphQueries(
  contractAbi: Abi,
  datasetName: string,
  contractAddress?: string
): GeneratedQuery[] {
  const { events } = categorizeAbi(contractAbi)

  if (events.length === 0) {
    return []
  }

  const queries: GeneratedQuery[] = []
  const addressFilter = contractAddress
    ? `WHERE address = decode('${contractAddress.toLowerCase().replace('0x', '')}', 'hex')`
    : ''

  // Find events with numeric fields for graphing
  events.forEach((event: any) => {
    const eventName = event.name
    const tableName = eventName.toLowerCase()
    const numericFields = event.inputs?.filter((input: any) =>
      input.type.includes('uint') || input.type.includes('int')
    ) || []

    if (numericFields.length > 0) {
      const numericField = numericFields[0].name || numericFields[0].type

      queries.push({
        name: `${eventName} over time`,
        description: `Track ${numericField} values over time`,
        query: `SELECT block_num, ${numericField}
FROM "${datasetName}".${tableName}
${addressFilter}
ORDER BY block_num
LIMIT 100`
      })
    }
  })

  // Event frequency over time
  if (events.length > 0) {
    const firstEvent = events[0]
    const tableName = firstEvent.name.toLowerCase()

    queries.push({
      name: 'Event frequency',
      description: 'Number of events per block',
      query: `SELECT block_num, COUNT(*) as count
FROM "${datasetName}".${tableName}
${addressFilter}
GROUP BY block_num
ORDER BY block_num
LIMIT 100`
    })
  }

  return queries
}
