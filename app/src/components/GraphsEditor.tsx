import { useState, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

type ChartType = 'line' | 'bar' | 'pie' | 'area'
type DataSource = 'sql' | 'events'

interface Props {
  sqlResults: any[]
  eventData: any[]
}

const CHART_COLORS = ['#007acc', '#00bfff', '#1e90ff', '#4169e1', '#6495ed', '#87ceeb']

export function GraphsEditor({ sqlResults, eventData }: Props) {
  const [dataSource, setDataSource] = useState<DataSource>('sql')
  const [chartType, setChartType] = useState<ChartType>('line')
  const [xAxis, setXAxis] = useState<string>('')
  const [yAxis, setYAxis] = useState<string>('')
  const [chartTitle, setChartTitle] = useState('')

  // Get the current data based on selected source
  const currentData = dataSource === 'sql' ? sqlResults : eventData

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
            dataSource === 'sql' ?
              'Run a SQL query to visualize data' :
              'Deploy a contract and call functions to generate events'
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
    <div className="h-full flex">
      {/* Left Panel - Configuration */}
      <div className="w-64 border-r border-[var(--ide-border-default)] bg-[var(--ide-sidebar-bg)] overflow-y-auto">
        <div className="p-3 space-y-4">
          {/* Data Source */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ide-text-muted)] mb-2 tracking-wider">
              DATA SOURCE
            </label>
            <div className="space-y-1">
              <button
                onClick={() => setDataSource('sql')}
                className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
                  dataSource === 'sql'
                    ? 'bg-[var(--ide-accent-selection)] text-[var(--ide-text-primary)]'
                    : 'text-[var(--ide-text-muted)] hover:bg-[var(--ide-hover-bg)]'
                }`}
              >
                SQL Query Results
              </button>
              <button
                onClick={() => setDataSource('events')}
                className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
                  dataSource === 'events'
                    ? 'bg-[var(--ide-accent-selection)] text-[var(--ide-text-primary)]'
                    : 'text-[var(--ide-text-muted)] hover:bg-[var(--ide-hover-bg)]'
                }`}
              >
                Event History
              </button>
            </div>
          </div>

          {/* Chart Type */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ide-text-muted)] mb-2 tracking-wider">
              CHART TYPE
            </label>
            <div className="grid grid-cols-2 gap-1">
              {(['line', 'bar', 'pie', 'area'] as ChartType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-3 py-1.5 text-xs rounded capitalize transition-colors ${
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

          {/* Column Mapping */}
          {availableColumns.length > 0 && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[var(--ide-text-muted)] mb-2 tracking-wider">
                  X-AXIS
                </label>
                <select
                  value={xAxis}
                  onChange={(e) => setXAxis(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-[var(--ide-input-bg)] border border-[var(--ide-border-default)] rounded text-[var(--ide-text-primary)] focus:border-[var(--ide-accent-primary)] outline-none"
                >
                  {availableColumns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--ide-text-muted)] mb-2 tracking-wider">
                  Y-AXIS
                </label>
                <select
                  value={yAxis}
                  onChange={(e) => setYAxis(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-[var(--ide-input-bg)] border border-[var(--ide-border-default)] rounded text-[var(--ide-text-primary)] focus:border-[var(--ide-accent-primary)] outline-none"
                >
                  {availableColumns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Chart Title */}
          <div>
            <label className="block text-xs font-semibold text-[var(--ide-text-muted)] mb-2 tracking-wider">
              TITLE (OPTIONAL)
            </label>
            <input
              type="text"
              value={chartTitle}
              onChange={(e) => setChartTitle(e.target.value)}
              placeholder="Chart title..."
              className="w-full px-2 py-1.5 text-xs bg-[var(--ide-input-bg)] border border-[var(--ide-border-default)] rounded text-[var(--ide-text-primary)] placeholder-[var(--ide-text-muted)] focus:border-[var(--ide-accent-primary)] outline-none"
            />
          </div>

          {/* Data Info */}
          <div className="pt-4 border-t border-[var(--ide-border-default)]">
            <div className="text-xs text-[var(--ide-text-muted)] space-y-1">
              <div>Records: {currentData.length}</div>
              <div>Columns: {availableColumns.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Chart Preview */}
      <div className="flex-1 flex flex-col bg-[var(--ide-editor-bg)]">
        {chartTitle && (
          <div className="px-4 py-3 border-b border-[var(--ide-border-default)]">
            <h2 className="text-sm font-semibold text-[var(--ide-text-primary)]">{chartTitle}</h2>
          </div>
        )}
        <div className="flex-1 p-4">
          {renderChart()}
        </div>
      </div>
    </div>
  )
}
