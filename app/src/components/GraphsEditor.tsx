import { useState, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import type { Address, Abi } from 'viem'
import { categorizeAbi } from '../lib/abiHelpers'

type ChartType = 'line' | 'bar' | 'pie' | 'area'

interface Props {
  contractAddress?: Address
  contractAbi?: Abi
  sqlResults: any[]
  isLoading: boolean
  chartType: ChartType
  onChartTypeChange: (type: ChartType) => void
}

const CHART_COLORS = ['#007acc', '#00bfff', '#1e90ff', '#4169e1', '#6495ed', '#87ceeb']

const generateExampleQueries = (contractAddress?: Address, contractAbi?: Abi): Array<{
  name: string
  description: string
  query: string
  chartType: ChartType
}> => {
  if (!contractAbi) return []

  const { events } = categorizeAbi(contractAbi)
  if (events.length === 0) return []

  const queries: Array<{
    name: string
    description: string
    query: string
    chartType: ChartType
  }> = []

  // For each event, create a time-series query
  events.forEach((event) => {
    const eventName = event.name.toLowerCase()
    const tableName = `"eth_global/counter@dev".${eventName}`

    // Find a numeric field to plot (first uint/int parameter)
    const numericField = event.inputs?.find(input =>
      input.type.startsWith('uint') || input.type.startsWith('int')
    )

    if (numericField) {
      queries.push({
        name: `${event.name} over time`,
        description: `${event.name} events by block`,
        query: contractAddress
          ? `SELECT block_num, ${numericField.name} FROM ${tableName} WHERE address = decode('${contractAddress.toLowerCase().replace('0x', '')}', 'hex') ORDER BY block_num ASC LIMIT 50`
          : `SELECT block_num, ${numericField.name} FROM ${tableName} ORDER BY block_num ASC LIMIT 50`,
        chartType: 'line' as ChartType,
      })
    } else {
      // If no numeric field, just count events
      queries.push({
        name: `${event.name} count over time`,
        description: `${event.name} event frequency`,
        query: contractAddress
          ? `SELECT block_num, COUNT(*) as event_count FROM ${tableName} WHERE address = decode('${contractAddress.toLowerCase().replace('0x', '')}', 'hex') GROUP BY block_num ORDER BY block_num ASC LIMIT 50`
          : `SELECT block_num, COUNT(*) as event_count FROM ${tableName} GROUP BY block_num ORDER BY block_num ASC LIMIT 50`,
        chartType: 'line' as ChartType,
      })
    }
  })

  // Event counts comparison (bar chart)
  if (events.length > 1) {
    const unionQueries = events.map(event =>
      `SELECT '${event.name}' as event_type, COUNT(*) as count FROM "eth_global/counter@dev".${event.name.toLowerCase()}`
    ).join('\nUNION ALL\n')

    queries.push({
      name: 'Event counts by type',
      description: 'Compare event frequencies',
      query: unionQueries,
      chartType: 'bar' as ChartType,
    })

    // Event distribution (pie chart)
    queries.push({
      name: 'Event distribution',
      description: 'Pie chart of event types',
      query: unionQueries,
      chartType: 'pie' as ChartType,
    })
  }

  // Area chart for first event with numeric field
  const firstEventWithNumeric = events.find(event =>
    event.inputs?.some(input => input.type.startsWith('uint') || input.type.startsWith('int'))
  )

  if (firstEventWithNumeric) {
    const numericField = firstEventWithNumeric.inputs?.find(input =>
      input.type.startsWith('uint') || input.type.startsWith('int')
    )
    const eventName = firstEventWithNumeric.name.toLowerCase()

    queries.push({
      name: `${firstEventWithNumeric.name} trend`,
      description: `Area chart of ${firstEventWithNumeric.name}`,
      query: `SELECT block_num, ${numericField?.name} FROM "eth_global/counter@dev".${eventName} ORDER BY block_num ASC LIMIT 50`,
      chartType: 'area' as ChartType,
    })
  }

  return queries
}

export function GraphsEditor({ contractAddress, contractAbi, sqlResults, isLoading, chartType, onChartTypeChange }: Props) {
  const [xAxis, setXAxis] = useState<string>('')
  const [yAxis, setYAxis] = useState<string>('')

  // Get the current data
  const currentData = sqlResults

  // Get available columns from the data
  const availableColumns = useMemo(() => {
    if (currentData.length === 0) return []
    return Object.keys(currentData[0])
  }, [currentData])

  // Auto-select first two columns if not set
  useMemo(() => {
    if (availableColumns.length > 0 && !xAxis) {
      setXAxis(availableColumns[0])
    }
    if (availableColumns.length > 1 && !yAxis) {
      setYAxis(availableColumns[1])
    }
  }, [availableColumns, xAxis, yAxis])

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!xAxis || !yAxis || currentData.length === 0) return []

    return currentData.map((row) => ({
      name: String(row[xAxis]),
      value: Number(row[yAxis]) || 0,
    }))
  }, [currentData, xAxis, yAxis])

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-[var(--ide-text-muted)] text-sm">
          {currentData.length === 0 ? (
            'Select a query from the sidebar to visualize data'
          ) : (
            'Select columns to visualize'
          )}
        </div>
      )
    }

    const chartProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
    }

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
              <XAxis dataKey="name" stroke="#cccccc" />
              <YAxis stroke="#cccccc" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#252526',
                  border: '1px solid #3e3e42',
                  color: '#cccccc'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#007acc" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
              <XAxis dataKey="name" stroke="#cccccc" />
              <YAxis stroke="#cccccc" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#252526',
                  border: '1px solid #3e3e42',
                  color: '#cccccc'
                }}
              />
              <Legend />
              <Bar dataKey="value" fill="#007acc" />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#252526',
                  border: '1px solid #3e3e42',
                  color: '#cccccc'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
              <XAxis dataKey="name" stroke="#cccccc" />
              <YAxis stroke="#cccccc" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#252526',
                  border: '1px solid #3e3e42',
                  color: '#cccccc'
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="value" stroke="#007acc" fill="#007acc" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        )
    }
  }

  return (
    <div className="h-full flex flex-col bg-[var(--ide-editor-bg)]">
      {/* Configuration Bar */}
      {currentData.length > 0 && (
        <div className="flex-shrink-0 border-b border-[var(--ide-border-default)] p-3 bg-[var(--ide-sidebar-bg)]">
          <div className="flex items-center gap-4">
            {/* Chart Type */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[var(--ide-text-muted)] tracking-wider">
                CHART TYPE:
              </label>
              <div className="flex gap-1">
                {(['line', 'bar', 'pie', 'area'] as ChartType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => onChartTypeChange(type)}
                    className={`px-2 py-1 text-xs rounded capitalize transition-colors ${
                      chartType === type
                        ? 'bg-[var(--ide-accent-primary)] text-white'
                        : 'bg-[var(--ide-input-bg)] text-[var(--ide-text-muted)] hover:bg-[var(--ide-hover-bg)]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Axes Configuration */}
            {availableColumns.length > 0 && (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-[var(--ide-text-muted)] tracking-wider">
                    X-AXIS:
                  </label>
                  <select
                    value={xAxis}
                    onChange={(e) => setXAxis(e.target.value)}
                    className="px-2 py-1 text-xs bg-[var(--ide-input-bg)] border border-[var(--ide-border-default)] rounded text-[var(--ide-text-primary)] focus:border-[var(--ide-accent-primary)] outline-none"
                  >
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-[var(--ide-text-muted)] tracking-wider">
                    Y-AXIS:
                  </label>
                  <select
                    value={yAxis}
                    onChange={(e) => setYAxis(e.target.value)}
                    className="px-2 py-1 text-xs bg-[var(--ide-input-bg)] border border-[var(--ide-border-default)] rounded text-[var(--ide-text-primary)] focus:border-[var(--ide-accent-primary)] outline-none"
                  >
                    {availableColumns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Chart Display */}
      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-[var(--ide-text-muted)] text-sm">
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading data...
          </div>
        ) : (
          renderChart()
        )}
      </div>
    </div>
  )
}
