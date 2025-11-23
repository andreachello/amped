import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Abi, Address } from 'viem'
import type { AbiFunction } from 'abitype'
import { performAmpQuery, EVENTS_DATASET } from '../lib/runtime'
import { categorizeAbi } from '../lib/abiHelpers'
import type { FunctionEventMapping } from '../lib/contractParser'
import { createAddressFilter, eventNameToTableName, paramNameToColumnName } from '../lib/ampHelpers'

const ITEMS_PER_PAGE = 10

interface Props {
  contractAddress?: Address
  contractAbi: Abi
  functionEventMapping?: FunctionEventMapping
  datasetName?: string
}

export function DynamicFunctionTables({ contractAddress, contractAbi, functionEventMapping, datasetName }: Props) {
  const { writeFunctions, events } = useMemo(() => categorizeAbi(contractAbi), [contractAbi])
  const [activeTab, setActiveTab] = useState(0)

  if (writeFunctions.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No write functions defined in this contract.
      </div>
    )
  }

  const activeFunction = writeFunctions[activeTab]

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
          {writeFunctions.map((func, index) => (
            <button
              key={func.name}
              onClick={() => setActiveTab(index)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${index === activeTab
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              {func.name}()
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-2">
        <FunctionTable
          func={activeFunction}
          contractAddress={contractAddress}
          functionEventMapping={functionEventMapping}
          allEvents={events}
          datasetName={datasetName}
        />
      </div>
    </div>
  )
}

interface FunctionTableProps {
  func: AbiFunction
  contractAddress?: Address
  functionEventMapping?: FunctionEventMapping
  allEvents: any[]
  datasetName?: string
}

function FunctionTable({ func, contractAddress, functionEventMapping, allEvents, datasetName }: FunctionTableProps) {
  const [page, setPage] = useState(0)

  // Get the events this function emits
  const eventNames = functionEventMapping?.[func.name] || []

  console.log(`🎯 [DynamicFunctionTables] ${func.name}():`, {
    mappedEvents: eventNames,
    hasMappingFromParser: eventNames.length > 0,
    allAvailableEvents: allEvents.map(e => e.name)
  })

  // If no mapping, try to infer from name similarity (legacy fallback)
  const inferredEvents = eventNames.length === 0
    ? allEvents.filter(event => {
      const funcStem = func.name.toLowerCase().replace(/^(increment|decrement|set|add|remove|update).*/, '$1')
      const eventStem = event.name.toLowerCase().replace(/(ed|d)$/, '')
      return funcStem === eventStem
    })
    : allEvents.filter(event => eventNames.includes(event.name))

  // Use the first matched event for querying
  const primaryEvent = inferredEvents[0]

  if (primaryEvent) {
    console.log(`  ✅ Using event: ${primaryEvent.name}`)
  } else {
    console.log(`  ❌ No event matched for ${func.name}()`)
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['Amp', 'Events', { function: func.name, address: contractAddress, page }] as const,
    async queryFn() {
      if (!primaryEvent) {
        return []
      }

      try {
        // Get column names from event inputs
        // Amp converts parameter names to snake_case (e.g., "newValue" -> "new_value")
        const eventColumns = primaryEvent.inputs?.map((input: any) => {
          if (input.name) {
            return paramNameToColumnName(input.name)
          }
          // If no name, use the type (but this shouldn't happen with proper ABIs)
          return input.type.toLowerCase().replace(/[^a-z0-9]/g, '_')
        }) || []
        const allColumns = ['block_num', 'timestamp', ...eventColumns]

        const offset = page * ITEMS_PER_PAGE
        // Amp's eventTables uses snake_case for table names (e.g., "ValueReturned" -> "value_returned")
        const tableName = eventNameToTableName(primaryEvent.name)
        const addressFilter = createAddressFilter(contractAddress)

        // Try to query the table - Amp creates tables lazily, so they might not exist until first query/event
        // We'll catch the error and show a helpful message

        const query = `SELECT ${allColumns.join(', ')}
          FROM "${datasetName || EVENTS_DATASET}".${tableName}
          ${addressFilter}
          ORDER BY block_num DESC
          LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}`

        return await performAmpQuery<Record<string, any>>(query)
      } catch (error: any) {
        // Check if it's a table not found error vs other error
        const errorMessage = error?.message || String(error)
        const isTableNotFound =
          errorMessage.includes('does not exist') ||
          errorMessage.includes('table') && errorMessage.includes('not found') ||
          errorMessage.includes('timeout') && errorMessage.includes('table may not exist') ||
          errorMessage.includes('Unknown table')

        if (isTableNotFound) {
          // Table doesn't exist - this can happen if:
          // 1. Dataset wasn't properly deployed/registered
          // 2. Amp dev server needs to be restarted to pick up new dataset
          // 3. Table will be created when first event is emitted (lazy creation)
          console.warn(`⚠️  Table "${tableName}" does not exist yet.`)
          console.warn(`   This usually means:`)
          console.warn(`   1. The dataset needs to be redeployed (try redeploying the contract)`)
          console.warn(`   2. Amp dev server needs to be restarted (run: pnpm amp dev)`)
          console.warn(`   3. Or the table will be created when ${func.name}() is first called`)
        } else {
          console.error(`❌ Error querying ${func.name}() events:`, error)
          console.error(`   Full error:`, errorMessage)
        }
        // Return empty array for any error - table might not exist yet or might be empty
        return []
      }
    },
    enabled: !!primaryEvent, // Only run query if we found an event
    retry: false, // Don't retry if table doesn't exist
    throwOnError: false, // Don't throw errors to error boundary
    staleTime: 5000, // Consider data stale after 5 seconds
    gcTime: 10000, // Garbage collect after 10 seconds
  })

  const results = data ?? []
  const hasData = results.length > 0
  const hasNextPage = results.length === ITEMS_PER_PAGE
  const hasPrevPage = page > 0

  // If no events mapped to this function, show a message
  if (!primaryEvent) {
    return (
      <div className="mt-4">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {func.name}() Transactions
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No events detected for this function
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {func.name}() Transactions
          </h2>
          {func.inputs && func.inputs.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Function parameters: ({func.inputs.map((i) => `${i.name || 'unnamed'}: ${i.type}`).join(', ')})
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Emits: {eventNames.join(', ') || primaryEvent.name}
          </p>
        </div>
      </div>

      <div className="mt-3 flow-root">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full py-2 align-middle">
            {isLoading ? (
              <div className="text-sm text-gray-500 py-4">Loading transactions...</div>
            ) : isError && results.length === 0 ? (
              <div className="text-sm text-amber-600 dark:text-amber-400 py-4 border border-amber-200 dark:border-amber-800 rounded-md p-4 bg-amber-50 dark:bg-amber-900/20">
                <p className="font-medium mb-2">⚠️ Table not found</p>
                <p className="text-xs mb-2">
                  The table "{eventNameToTableName(primaryEvent.name)}" doesn't exist yet. This usually means:
                </p>
                <ul className="text-xs list-disc list-inside space-y-1 mb-2">
                  <li>The dataset needs to be redeployed (try redeploying the contract)</li>
                  <li>Amp dev server needs to be restarted (run: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">pnpm amp dev</code>)</li>
                  <li>Or the table will be created when {func.name}() is first called and emits the {primaryEvent.name} event</li>
                </ul>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Dataset: {datasetName || EVENTS_DATASET}
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="text-sm text-gray-500 py-4">
                No {func.name}() transactions yet. Call this function to see transactions appear here.
              </div>
            ) : (
              <>
                <table className="relative min-w-full divide-y divide-gray-300 dark:divide-white/15">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="py-2 pr-2 pl-3 text-left text-sm font-semibold text-gray-900 sm:pl-0 dark:text-white"
                      >
                        Block #
                      </th>
                      <th
                        scope="col"
                        className="px-2 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        Timestamp
                      </th>
                      {primaryEvent.inputs?.map((input: any, idx: number) => {
                        const columnName = input.name ? paramNameToColumnName(input.name) : `param${idx}`
                        return (
                          <th
                            key={idx}
                            scope="col"
                            className="px-2 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white"
                          >
                            {input.name || `param${idx}`}
                            <span className="text-xs text-gray-500 ml-1">({input.type})</span>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {results.map((row, rowIndex) => (
                      <tr key={`${row.block_num}-${row.timestamp}-${rowIndex}`}>
                        <td className="py-2 pr-2 pl-3 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0 dark:text-white">
                          {row.block_num}
                        </td>
                        <td className="px-2 py-2 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {row.timestamp}
                        </td>
                        {primaryEvent.inputs?.map((input: any, idx: number) => {
                          // Use snake_case column name to match Amp's table schema
                          const columnName = input.name ? paramNameToColumnName(input.name) : input.type.toLowerCase().replace(/[^a-z0-9]/g, '_')
                          const value = row[columnName]
                          return (
                            <td
                              key={idx}
                              className="px-2 py-2 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400"
                            >
                              {value !== null && value !== undefined
                                ? String(value)
                                : 'N/A'}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-white/10 px-4 py-3 sm:px-0">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={!hasPrevPage}
                      className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasNextPage}
                      className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-400">
                        Page <span className="font-medium">{page + 1}</span>
                        {hasData && <span> • {results.length} results</span>}
                      </p>
                    </div>
                    <div>
                      <nav
                        className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                        aria-label="Pagination"
                      >
                        <button
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                          disabled={!hasPrevPage}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Previous</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => setPage((p) => p + 1)}
                          disabled={!hasNextPage}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Next</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
