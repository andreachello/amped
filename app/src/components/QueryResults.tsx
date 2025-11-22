interface QueryResultsProps {
  results: any[]
  isLoading: boolean
  error?: string | null
  onExportCSV: () => void
  onExportJSON: () => void
}

export function QueryResults({ results, isLoading, error, onExportCSV, onExportJSON }: QueryResultsProps) {
  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 py-8 text-center">
        Executing query...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Query Error</h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              <pre className="whitespace-pre-wrap font-mono text-xs">{error}</pre>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!results || results.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-8 text-center">
        No results. Try running a query.
      </div>
    )
  }

  // Get column names from first result
  const columns = Object.keys(results[0])

  return (
    <div className="space-y-4">
      {/* Export Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {results.length} result{results.length !== 1 ? 's' : ''}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onExportCSV}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Export CSV
          </button>
          <button
            onClick={onExportJSON}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300 dark:divide-white/15">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((column, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/10 bg-white dark:bg-gray-900">
            {results.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((column, colIdx) => {
                  const value = row[column]
                  return (
                    <td
                      key={colIdx}
                      className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400"
                    >
                      {value !== null && value !== undefined
                        ? String(value)
                        : <span className="text-gray-400 dark:text-gray-600">null</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
