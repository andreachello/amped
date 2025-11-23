import { useState, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import type { Address } from 'viem'
import { QueryResults } from './QueryResults'

const EXAMPLE_QUERIES = (contractAddress?: Address) => [
  {
    name: 'All events from current contract',
    query: contractAddress
      ? `SELECT * FROM "eth_global/counter@dev".incremented WHERE address = decode('${contractAddress.toLowerCase().replace('0x', '')}', 'hex') ORDER BY block_num DESC LIMIT 10`
      : `SELECT * FROM "eth_global/counter@dev".incremented ORDER BY block_num DESC LIMIT 10`
  },
  {
    name: 'Recent incremented events',
    query: `SELECT block_num, timestamp, count FROM "eth_global/counter@dev".incremented ORDER BY block_num DESC LIMIT 10`
  },
  {
    name: 'Recent decremented events',
    query: `SELECT block_num, timestamp, count FROM "eth_global/counter@dev".decremented ORDER BY block_num DESC LIMIT 10`
  },
  {
    name: 'Recent returned events',
    query: `SELECT block_num, timestamp, count FROM "eth_global/counter@dev".returned ORDER BY block_num DESC LIMIT 10`
  },
  {
    name: 'All events from all contracts',
    query: `SELECT block_num, timestamp, address FROM "_/anvil@0.0.1".logs ORDER BY block_num DESC LIMIT 20`
  },
  {
    name: 'Count events by type',
    query: `SELECT 'incremented' as event_type, COUNT(*) as count FROM "eth_global/counter@dev".incremented
UNION ALL
SELECT 'decremented', COUNT(*) FROM "eth_global/counter@dev".decremented
UNION ALL
SELECT 'returned', COUNT(*) FROM "eth_global/counter@dev".returned`
  },
  {
    name: 'Group by count value',
    query: contractAddress
      ? `SELECT count, COUNT(*) FROM "eth_global/counter@dev".decremented WHERE address = decode('${contractAddress.toLowerCase().replace('0x', '')}', 'hex') GROUP BY count ORDER BY count DESC LIMIT 10`
      : `SELECT count, COUNT(*) FROM "eth_global/counter@dev".decremented GROUP BY count ORDER BY count DESC LIMIT 10`
  }
]

const SAVED_QUERIES_KEY = 'amp-demo-saved-queries'

interface SavedQuery {
  name: string
  query: string
  savedAt: number
}

interface Props {
  contractAddress?: Address
}

export function SQLQueryInterface({ contractAddress }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [queryName, setQueryName] = useState('')

  // Load saved queries on mount
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_QUERIES_KEY)
    if (saved) {
      try {
        setSavedQueries(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load saved queries:', e)
      }
    }
  }, [])

  const executeQuery = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('http://localhost:3001/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Query failed')
      }

      setResults(data.results || [])
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const loadExample = (example: { name: string; query: string }) => {
    setQuery(example.query)
    setError(null)
  }

  const saveQuery = () => {
    if (!queryName.trim() || !query.trim()) return

    const newQuery: SavedQuery = {
      name: queryName,
      query,
      savedAt: Date.now()
    }

    const updated = [...savedQueries, newQuery]
    setSavedQueries(updated)
    localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(updated))
    setShowSaveDialog(false)
    setQueryName('')
  }

  const loadSavedQuery = (saved: SavedQuery) => {
    setQuery(saved.query)
    setError(null)
  }

  const deleteSavedQuery = (index: number) => {
    const updated = savedQueries.filter((_, i) => i !== index)
    setSavedQueries(updated)
    localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(updated))
  }

  const exportCSV = () => {
    if (results.length === 0) return

    const headers = Object.keys(results[0])
    const csvRows = [
      headers.join(','),
      ...results.map(row =>
        headers.map(header => {
          const value = row[header]
          const stringValue = value !== null && value !== undefined ? String(value) : ''
          return `"${stringValue.replace(/"/g, '""')}"`
        }).join(',')
      )
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-results-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportJSON = () => {
    if (results.length === 0) return

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-2">
      {/* Query Editor */}
      <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="bg-gray-800 text-white px-4 py-2 text-sm font-mono flex items-center justify-between">
          <span>SQL Query</span>
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!query.trim()}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Query
          </button>
        </div>
        <CodeMirror
          value={query}
          height="120px"
          theme="dark"
          extensions={[sql()]}
          onChange={(value) => setQuery(value)}
          className="text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={executeQuery}
          disabled={isLoading || !query.trim()}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Executing...' : 'Run Query'}
        </button>

        {/* Example Queries Dropdown */}
        <div className="relative group">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
            Example Queries ▾
          </button>
          <div className="hidden group-hover:block absolute z-10 mt-1 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
            {EXAMPLE_QUERIES(contractAddress).map((example, idx) => (
              <button
                key={idx}
                onClick={() => loadExample(example)}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md last:rounded-b-md"
              >
                {example.name}
              </button>
            ))}
          </div>
        </div>

        {/* Saved Queries Dropdown */}
        {savedQueries.length > 0 && (
          <div className="relative group">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
              Saved Queries ({savedQueries.length}) ▾
            </button>
            <div className="hidden group-hover:block absolute z-10 mt-1 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-64 overflow-y-auto">
              {savedQueries.map((saved, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <button
                    onClick={() => loadSavedQuery(saved)}
                    className="flex-1 text-left text-gray-700 dark:text-gray-300"
                  >
                    {saved.name}
                  </button>
                  <button
                    onClick={() => deleteSavedQuery(idx)}
                    className="ml-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Query Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Save Query</h3>
            <input
              type="text"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              placeholder="Query name..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={saveQuery}
                disabled={!queryName.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false)
                  setQueryName('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <QueryResults
        results={results}
        isLoading={isLoading}
        error={error}
        onExportCSV={exportCSV}
        onExportJSON={exportJSON}
      />
    </div>
  )
}
