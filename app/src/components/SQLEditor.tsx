import { useState, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import type { Address } from 'viem'

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
  query: string
  onQueryChange: (query: string) => void
  onExecuteQuery: () => void
  isLoading: boolean
}

export function SQLEditor({ contractAddress, query, onQueryChange, onExecuteQuery, isLoading }: Props) {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [queryName, setQueryName] = useState('')
  const [showExampleDropdown, setShowExampleDropdown] = useState(false)
  const [showSavedDropdown, setShowSavedDropdown] = useState(false)

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

  const loadExample = (example: { name: string; query: string }) => {
    onQueryChange(example.query)
    setShowExampleDropdown(false)
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
    onQueryChange(saved.query)
    setShowSavedDropdown(false)
  }

  const deleteSavedQuery = (index: number) => {
    const updated = savedQueries.filter((_, i) => i !== index)
    setSavedQueries(updated)
    localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(updated))
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-container')) {
        setShowExampleDropdown(false)
        setShowSavedDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="h-full flex flex-col p-3 space-y-3 overflow-visible">
      {/* Query Editor */}
      <div className="flex-1 flex flex-col border border-[var(--ide-border-default)] rounded-lg overflow-hidden">
        <div className="bg-gray-800 text-white px-4 py-2 text-sm font-mono flex items-center justify-between border-b border-[var(--ide-border-default)]">
          <span>SQL Query</span>
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!query.trim()}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save Query
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <CodeMirror
            value={query}
            height="100%"
            theme="dark"
            extensions={[sql()]}
            onChange={onQueryChange}
            className="text-sm h-full"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onExecuteQuery}
          disabled={isLoading || !query.trim()}
          className="inline-flex items-center px-4 py-2 shadow-sm text-sm font-medium rounded-md text-white bg-[var(--ide-accent-primary)] hover:bg-[var(--ide-accent-focus)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Executing...
            </>
          ) : (
            'Run Query'
          )}
        </button>

        {/* Example Queries Dropdown */}
        <div className="relative dropdown-container">
          <button
            onClick={() => {
              setShowExampleDropdown(!showExampleDropdown)
              setShowSavedDropdown(false)
            }}
            className="inline-flex items-center px-4 py-2 border border-[var(--ide-border-default)] shadow-sm text-sm font-medium rounded-md text-[var(--ide-text-primary)] bg-[var(--ide-input-bg)] hover:bg-[var(--ide-hover-bg)] transition-colors"
          >
            Example Queries ▾
          </button>
          {showExampleDropdown && (
            <div className="absolute z-[100] bottom-full mb-1 left-0 w-96 bg-[var(--ide-sidebar-bg)] border border-[var(--ide-border-default)] rounded-md shadow-lg">
              {EXAMPLE_QUERIES(contractAddress).map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => loadExample(example)}
                  className="block w-full text-left px-4 py-2 text-sm text-[var(--ide-text-primary)] hover:bg-[var(--ide-hover-bg)] first:rounded-t-md last:rounded-b-md transition-colors"
                >
                  {example.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Saved Queries Dropdown */}
        {savedQueries.length > 0 && (
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowSavedDropdown(!showSavedDropdown)
                setShowExampleDropdown(false)
              }}
              className="inline-flex items-center px-4 py-2 border border-[var(--ide-border-default)] shadow-sm text-sm font-medium rounded-md text-[var(--ide-text-primary)] bg-[var(--ide-input-bg)] hover:bg-[var(--ide-hover-bg)] transition-colors"
            >
              Saved Queries ({savedQueries.length}) ▾
            </button>
            {showSavedDropdown && (
              <div className="absolute z-[100] bottom-full mb-1 left-0 w-96 bg-[var(--ide-sidebar-bg)] border border-[var(--ide-border-default)] rounded-md shadow-lg max-h-64 overflow-y-auto">
                {savedQueries.map((saved, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-4 py-2 text-sm hover:bg-[var(--ide-hover-bg)] transition-colors"
                  >
                    <button
                      onClick={() => loadSavedQuery(saved)}
                      className="flex-1 text-left text-[var(--ide-text-primary)]"
                    >
                      {saved.name}
                    </button>
                    <button
                      onClick={() => deleteSavedQuery(idx)}
                      className="ml-2 text-red-400 hover:text-red-300 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save Query Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--ide-sidebar-bg)] border border-[var(--ide-border-default)] rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-[var(--ide-text-primary)] mb-4">Save Query</h3>
            <input
              type="text"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              placeholder="Query name..."
              className="w-full px-3 py-2 border border-[var(--ide-border-default)] rounded-md bg-[var(--ide-input-bg)] text-[var(--ide-text-primary)]"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={saveQuery}
                disabled={!queryName.trim()}
                className="flex-1 px-4 py-2 bg-[var(--ide-accent-primary)] text-white rounded-md hover:bg-[var(--ide-accent-focus)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false)
                  setQueryName('')
                }}
                className="flex-1 px-4 py-2 border border-[var(--ide-border-default)] rounded-md text-[var(--ide-text-primary)] hover:bg-[var(--ide-hover-bg)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
