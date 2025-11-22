import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Abi, Address } from 'viem'
import type { AbiFunction } from 'abitype'
import { performAmpQuery, EVENTS_DATASET } from '../lib/runtime'
import { categorizeAbi } from '../lib/abiHelpers'
import type { FunctionEventMapping } from '../lib/contractParser'
import { createAddressFilter } from '../lib/ampHelpers'

const ITEMS_PER_PAGE = 10

interface Props {
  contractAddress?: Address
  contractAbi: Abi
  functionEventMapping?: FunctionEventMapping
}

export function DynamicFunctionTables({ contractAddress, contractAbi, functionEventMapping }: Props) {
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
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {writeFunctions.map((func, index) => (
            <button
              key={func.name}
              onClick={() => setActiveTab(index)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                index === activeTab
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
      <div className="mt-4">
        <FunctionTable
          func={activeFunction}
          contractAddress={contractAddress}
          functionEventMapping={functionEventMapping}
          allEvents={events}
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
}

function FunctionTable({ func, contractAddress, functionEventMapping, allEvents }: FunctionTableProps) {
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
        const eventColumns = primaryEvent.inputs?.map((input: any) => input.name || input.type) || []
        const allColumns = ['block_num', 'timestamp', ...eventColumns]

        const offset = page * ITEMS_PER_PAGE
        const tableName = primaryEvent.name.toLowerCase()
        const addressFilter = createAddressFilter(contractAddress)

        const query = `SELECT ${allColumns.join(', ')}
          FROM "${EVENTS_DATASET}".${tableName}
          ${addressFilter}
          ORDER BY block_num DESC
          LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}`

        return await performAmpQuery<Record<string, any>>(query)
      } catch (error: any) {
        // Table doesn't exist yet - this is normal for new contracts/functions
        // Just return empty array instead of throwing
        console.log(`No data for ${func.name}() yet - table may not exist until function is called`)
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
            ) : isError ? (
              <div className="text-sm text-gray-500 py-4">
                No {func.name}() transactions yet. Call this function to see transactions appear here.
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
                        className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0 dark:text-white"
                      >
                        Block #
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                      >
                        Timestamp
                      </th>
                      {primaryEvent.inputs?.map((input: any, idx: number) => (
                        <th
                          key={idx}
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                        >
                          {input.name || `param${idx}`}
                          <span className="text-xs text-gray-500 ml-1">({input.type})</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {results.map((row, rowIndex) => (
                      <tr key={`${row.block_num}-${row.timestamp}-${rowIndex}`}>
                        <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-0 dark:text-white">
                          {row.block_num}
                        </td>
                        <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {row.timestamp}
                        </td>
                        {primaryEvent.inputs?.map((input: any, idx: number) => {
                          const value = row[input.name || input.type]
                          return (
                            <td
                              key={idx}
                              className="px-3 py-4 text-sm whitespace-nowrap text-gray-500 dark:text-gray-400"
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
