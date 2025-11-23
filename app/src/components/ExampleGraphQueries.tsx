import { EVENTS_DATASET } from '../lib/runtime'

interface Props {
  contractAddress?: string
  onSelectQuery: (query: string, title: string) => void
}

const exampleQueries = [
  {
    title: 'Event Count Over Time',
    description: 'Track all events by block number',
    query: `SELECT block_num, COUNT(*) as count
FROM "${EVENTS_DATASET}".incremented
GROUP BY block_num
ORDER BY block_num`
  },
  {
    title: 'Events by Type',
    description: 'Distribution of event types',
    query: `SELECT event_type, COUNT(*) as count
FROM "${EVENTS_DATASET}".incremented
GROUP BY event_type`
  },
  {
    title: 'Timestamp Analysis',
    description: 'Events over time with timestamps',
    query: `SELECT timestamp, COUNT(*) as count
FROM "${EVENTS_DATASET}".incremented
GROUP BY timestamp
ORDER BY timestamp`
  },
  {
    title: 'Block Activity',
    description: 'Activity per block',
    query: `SELECT block_num, COUNT(*) as activity
FROM "${EVENTS_DATASET}".incremented
GROUP BY block_num
ORDER BY activity DESC
LIMIT 20`
  }
]

export function ExampleGraphQueries({ contractAddress, onSelectQuery }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-[var(--ide-text-muted)] mb-2 tracking-wider">
          EXAMPLE QUERIES
        </h3>
        <div className="text-xs text-[var(--ide-text-muted)] mb-3">
          Click to load query into SQL editor
        </div>
      </div>

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
