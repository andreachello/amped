import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Abi, Address } from 'viem'
import type { AbiEvent } from 'abitype'
import { performAmpQuery, EVENTS_DATASET } from '../lib/runtime'
import { categorizeAbi } from '../lib/abiHelpers'

const ITEMS_PER_PAGE = 10

interface Props {
  contractAddress?: Address
  contractAbi: Abi
}

export function DynamicEventTables({ contractAddress, contractAbi }: Props) {
  const { events } = useMemo(() => categorizeAbi(contractAbi), [contractAbi])

  if (events.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No events defined in this contract.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {events.map((event) => (
        <EventTable key={event.name} event={event} contractAddress={contractAddress} />
      ))}
    </div>
  )
}

interface EventTableProps {
  event: AbiEvent
  contractAddress?: Address
}

function EventTable({ event, contractAddress }: EventTableProps) {
  const [page, setPage] = useState(0)

  // Convert event name to lowercase for Amp table name
  const tableName = event.name.toLowerCase()

  const { data, isLoading, error } = useQuery({
    queryKey: ['Amp', 'Events', { event: event.name, address: contractAddress, page }] as const,
    async queryFn() {
      try {
        // Get column names from event inputs
        const eventColumns = event.inputs?.map((input) => input.name || input.type) || []
        const allColumns = ['block_num', 'timestamp', ...eventColumns]

        const offset = page * ITEMS_PER_PAGE
        const query = `SELECT ${allColumns.join(', ')}
          FROM "${EVENTS_DATASET}".${tableName}
          ORDER BY block_num DESC
          LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}`

        return await performAmpQuery<Record<string, any>>(query)
      } catch (error) {
        console.error(`Failed to query ${event.name} events:`, error)
        return []
      }
    },
  })

  const results = data ?? []
  const hasData = results.length > 0
  const hasNextPage = results.length === ITEMS_PER_PAGE
  const hasPrevPage = page > 0

  return (
    <div className="mt-4">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {event.name} Events
          </h2>
          {event.inputs && event.inputs.length > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ({event.inputs.map((i) => `${i.name || 'unnamed'}: ${i.type}`).join(', ')})
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flow-root">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full py-2 align-middle">
            {isLoading ? (
              <div className="text-sm text-gray-500 py-4">Loading events...</div>
            ) : error ? (
              <div className="text-sm text-red-600 py-4">
                Failed to load events. Table may not exist yet.
              </div>
            ) : results.length === 0 ? (
              <div className="text-sm text-gray-500 py-4">No {event.name} events yet.</div>
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
                      {event.inputs?.map((input, idx) => (
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
                        {event.inputs?.map((input, idx) => {
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
