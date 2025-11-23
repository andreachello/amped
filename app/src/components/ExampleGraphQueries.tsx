import { useMemo } from 'react'
import type { Abi } from 'viem'
import { generateGraphQueries } from '../lib/sqlQueryGenerator'

interface Props {
  contractAddress?: string
  contractAbi?: Abi
  datasetName?: string
  onSelectQuery: (query: string, title: string) => void
}

export function ExampleGraphQueries({ contractAddress, contractAbi, datasetName, onSelectQuery }: Props) {
  // Generate graph queries based on the deployed contract's ABI
  const exampleQueries = useMemo(() => {
    if (contractAbi && datasetName) {
      return generateGraphQueries(contractAbi, datasetName, contractAddress)
    }
    return []
  }, [contractAbi, datasetName, contractAddress])
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-[var(--ide-text-muted)] mb-2 tracking-wider">
          EXAMPLE GRAPH QUERIES
        </h3>
        <div className="text-xs text-[var(--ide-text-muted)] mb-3">
          {exampleQueries.length > 0
            ? 'Click to load query into SQL editor'
            : 'Deploy a contract with events to see example queries'}
        </div>
      </div>

      {exampleQueries.length === 0 ? (
        <div className="text-xs text-[var(--ide-text-muted)] italic p-3 border border-[var(--ide-border-default)] rounded">
          No graph queries available. Deploy a contract with events to generate example queries.
        </div>
      ) : (
        <div className="space-y-2">
          {exampleQueries.map((example, index) => (
          <button
            key={index}
            onClick={() => onSelectQuery(example.query, example.title)}
            className="w-full text-left p-3 border border-[var(--ide-border-default)] rounded hover:bg-[var(--ide-hover-bg)] hover:border-[var(--ide-accent-primary)] transition-all group"
          >
            <div className="flex items-start justify-between mb-1">
              <div className="text-xs font-medium text-[var(--ide-text-primary)] group-hover:text-[var(--ide-accent-primary)]">
                {example.title}
              </div>
              <svg
                className="w-3 h-3 text-[var(--ide-text-muted)] group-hover:text-[var(--ide-accent-primary)] flex-shrink-0 ml-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div className="text-xs text-[var(--ide-text-muted)] mb-2">
              {example.description}
            </div>
            <div className="text-xs font-mono text-[var(--ide-text-muted)] bg-[var(--ide-editor-bg)] p-2 rounded border border-[var(--ide-border-default)]">
              {example.query.split('\n')[0]}...
            </div>
          </button>
        ))}
        </div>
      )}

      <div className="pt-2 border-t border-[var(--ide-border-default)]">
        <div className="text-xs text-[var(--ide-text-muted)] space-y-1">
          <div>• Click query to load in SQL tab</div>
          <div>• Switch to Graphs tab to visualize</div>
          <div>• Customize X/Y axes and chart type</div>
          <div>• All contract events auto-loaded</div>
        </div>
      </div>
    </div>
  )
}
