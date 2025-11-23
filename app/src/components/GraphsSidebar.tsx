import { useMemo } from 'react'
import type { Address, Abi } from 'viem'
import { categorizeAbi } from '../lib/abiHelpers'

type ChartType = 'line' | 'bar' | 'pie' | 'area'

interface ExampleQuery {
  name: string
  description: string
  query: string
  chartType: ChartType
}

interface Props {
  contractAddress?: Address
  contractAbi?: Abi
  onSelectQuery: (query: ExampleQuery, index: number) => void
  selectedQueryIndex: number | null
}

const generateExampleQueries = (contractAddress?: Address, contractAbi?: Abi): ExampleQuery[] => {
  if (!contractAbi) return []

  const { events } = categorizeAbi(contractAbi)
  if (events.length === 0) return []

  const queries: ExampleQuery[] = []

  // For each event, create a time-series query
  events.forEach((event) => {
    const eventName = event.name.toLowerCase()
    const tableName = `"eth_global/counter@dev".${eventName}`

    // Find a numeric field to plot (first uint/int parameter)
    const numericField = event.inputs?.find(input =>
      input.type.startsWith('uint') || input.type.startsWith('int')
    )

    if (numericField) {
      queries.push({
        name: `${event.name} over time`,
        description: `${event.name} events by block`,
        query: contractAddress
          ? `SELECT block_num, ${numericField.name} FROM ${tableName} WHERE address = decode('${contractAddress.toLowerCase().replace('0x', '')}', 'hex') ORDER BY block_num ASC LIMIT 50`
          : `SELECT block_num, ${numericField.name} FROM ${tableName} ORDER BY block_num ASC LIMIT 50`,
        chartType: 'line' as ChartType,
      })
    } else {
      // If no numeric field, just count events
      queries.push({
        name: `${event.name} count over time`,
        description: `${event.name} event frequency`,
        query: contractAddress
          ? `SELECT block_num, COUNT(*) as event_count FROM ${tableName} WHERE address = decode('${contractAddress.toLowerCase().replace('0x', '')}', 'hex') GROUP BY block_num ORDER BY block_num ASC LIMIT 50`
          : `SELECT block_num, COUNT(*) as event_count FROM ${tableName} GROUP BY block_num ORDER BY block_num ASC LIMIT 50`,
        chartType: 'line' as ChartType,
      })
    }
  })

  // Event counts comparison (bar chart)
  if (events.length > 1) {
    const unionQueries = events.map(event =>
      `SELECT '${event.name}' as event_type, COUNT(*) as count FROM "eth_global/counter@dev".${event.name.toLowerCase()}`
    ).join('\nUNION ALL\n')

    queries.push({
      name: 'Event counts by type',
      description: 'Compare event frequencies',
      query: unionQueries,
      chartType: 'bar' as ChartType,
    })

    // Event distribution (pie chart)
    queries.push({
      name: 'Event distribution',
      description: 'Pie chart of event types',
      query: unionQueries,
      chartType: 'pie' as ChartType,
    })
  }

  // Area chart for first event with numeric field
  const firstEventWithNumeric = events.find(event =>
    event.inputs?.some(input => input.type.startsWith('uint') || input.type.startsWith('int'))
  )

  if (firstEventWithNumeric) {
    const numericField = firstEventWithNumeric.inputs?.find(input =>
      input.type.startsWith('uint') || input.type.startsWith('int')
    )
    const eventName = firstEventWithNumeric.name.toLowerCase()

    queries.push({
      name: `${firstEventWithNumeric.name} trend`,
      description: `Area chart of ${firstEventWithNumeric.name}`,
      query: `SELECT block_num, ${numericField?.name} FROM "eth_global/counter@dev".${eventName} ORDER BY block_num ASC LIMIT 50`,
      chartType: 'area' as ChartType,
    })
  }

  return queries
}

export function GraphsSidebar({ contractAddress, contractAbi, onSelectQuery, selectedQueryIndex }: Props) {
  const exampleQueries = useMemo(() => generateExampleQueries(contractAddress, contractAbi), [contractAddress, contractAbi])

  return (
    <div className="space-y-1">
      {exampleQueries.length === 0 ? (
        <div className="px-3 py-4 text-xs text-[var(--ide-text-muted)] italic">
          Deploy a contract with events to see example queries
        </div>
      ) : (
        exampleQueries.map((query, idx) => (
          <button
            key={idx}
            onClick={() => onSelectQuery(query, idx)}
            className={`w-full text-left px-3 py-2 transition-colors ${
              selectedQueryIndex === idx
                ? 'bg-[var(--ide-accent-selection)]'
                : 'hover:bg-[var(--ide-hover-bg)]'
            }`}
          >
            <div className="flex items-start gap-2">
              <svg className="h-3 w-3 flex-shrink-0 text-[var(--ide-text-muted)] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[var(--ide-text-primary)] truncate">
                  {query.name}
                </div>
                <div className="text-xs text-[var(--ide-text-muted)] mt-0.5">
                  {query.description}
                </div>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  )
}
