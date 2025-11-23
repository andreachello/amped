import { useState, useEffect } from 'react'

const SAVED_QUERIES_KEY = 'amp-demo-saved-queries'

interface SavedQuery {
  name: string
  query: string
  savedAt: number
}

interface Props {
  onSelectQuery: (query: string) => void
}

export function SavedQueries({ onSelectQuery }: Props) {
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])

  const loadQueries = () => {
    try {
      const stored = localStorage.getItem(SAVED_QUERIES_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setSavedQueries(Array.isArray(parsed) ? parsed : [])
      } else {
        setSavedQueries([])
      }
    } catch (e) {
      console.error('Failed to load saved queries:', e)
      setSavedQueries([])
    }
  }

  useEffect(() => {
    loadQueries()

    // Listen for storage events to refresh when queries are saved from SQL editor
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SAVED_QUERIES_KEY) {
        loadQueries()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const deleteQuery = (index: number) => {
    const updated = savedQueries.filter((_, i) => i !== index)
    setSavedQueries(updated)
    localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(updated))
  }

  return (
    <div className="h-full flex flex-col bg-[var(--ide-sidebar-bg)]">
      <div className="px-3 py-2 border-b border-[var(--ide-border-default)]">
        <h3 className="text-xs font-semibold text-[var(--ide-text-muted)] tracking-wider">
          SQL QUERIES
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {savedQueries.length === 0 ? (
          <div className="p-3 text-xs text-[var(--ide-text-muted)] italic">
            No saved queries yet. Save queries from the SQL editor.
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {savedQueries.map((query, index) => (
              <div
                key={index}
                className="group relative"
              >
                <button
                  onClick={() => onSelectQuery(query.query)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-[var(--ide-hover-bg)] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-[var(--ide-text-primary)] truncate">
                        {query.name}
                      </div>
                      <div className="text-[10px] text-[var(--ide-text-muted)] font-mono mt-0.5 truncate">
                        {query.query.split('\n')[0]}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteQuery(index)
                      }}
                      className="opacity-0 group-hover:opacity-100 ml-2 p-1 hover:bg-[var(--ide-border-default)] rounded transition-opacity"
                      title="Delete query"
                    >
                      <svg className="w-3 h-3 text-[var(--ide-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-[var(--ide-border-default)]">
        <div className="text-[10px] text-[var(--ide-text-muted)] space-y-1">
          <div>• Click query to load in editor</div>
          <div>• Hover to delete</div>
        </div>
      </div>
    </div>
  )
}
