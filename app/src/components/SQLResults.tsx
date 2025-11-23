import { QueryResults } from './QueryResults'

interface Props {
  results: any[]
  isLoading: boolean
  error: string | null
}

export function SQLResults({ results, isLoading, error }: Props) {
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
    <div className="h-full overflow-auto">
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
