import { useState, useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ComposedChart } from 'recharts'

type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'composed'
type DataSource = 'sql' | 'events'

interface ChartTemplate {
  id: string
  name: string
  description: string
  chartType: ChartType
  xAxis: string | null // null means auto-detect
  yAxis: string | null
  requiresTimeSeries?: boolean
  requiresNumeric?: boolean
  transform?: (data: any[]) => any[]
}

interface Props {
  sqlResults: any[]
  eventData: any[]
}

const CHART_COLORS = ['#007acc', '#00bfff', '#1e90ff', '#4169e1', '#6495ed', '#87ceeb', '#ff6b6b', '#4ecdc4']

export function GraphsEditor({ sqlResults, eventData }: Props) {
  const [dataSource, setDataSource] = useState<DataSource>('sql')
  const [chartType, setChartType] = useState<ChartType>('line')
  const [xAxis, setXAxis] = useState<string>('')
  const [yAxis, setYAxis] = useState<string>('')
  const [chartTitle, setChartTitle] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(true)

  // Get the current data based on selected source
  const currentData = dataSource === 'sql' ? sqlResults : eventData

  // Analyze data structure
  const dataAnalysis = useMemo(() => {
    if (currentData.length === 0) return null

    const firstRow = currentData[0]
    const columns = Object.keys(firstRow)
    
    // Find time-series columns
    const timeColumns = columns.filter(col => 
      col.toLowerCase().includes('block') || 
      col.toLowerCase().includes('timestamp') ||
      col.toLowerCase().includes('time')
    )

    // Find numeric columns
    const numericColumns = columns.filter(col => {
      if (timeColumns.includes(col)) return false
      const sample = firstRow[col]
      return typeof sample === 'number' || 
             (typeof sample === 'string' && !isNaN(Number(sample)) && sample.trim() !== '')
    })

    // Find categorical columns
    const categoricalColumns = columns.filter(col => 
      !timeColumns.includes(col) && !numericColumns.includes(col)
    )

    // Detect if data is time-series
    const isTimeSeries = timeColumns.length > 0 && numericColumns.length > 0

    return {
      columns,
      timeColumns,
      numericColumns,
      categoricalColumns,
      isTimeSeries,
      rowCount: currentData.length
    }
  }, [currentData])

  // Generate chart templates based on data analysis
  const availableTemplates = useMemo(() => {
    if (!dataAnalysis) return []

    const templates: ChartTemplate[] = []

    // Template 1: Time series (if we have time + numeric data)
    if (dataAnalysis.isTimeSeries) {
      const timeCol = dataAnalysis.timeColumns[0]
      const numericCol = dataAnalysis.numericColumns[0]
      
      templates.push({
        id: 'time-series',
        name: 'Time Series',
        description: `Track ${numericCol} over ${timeCol}`,
        chartType: 'line',
        xAxis: timeCol,
        yAxis: numericCol,
        requiresTimeSeries: true
      })

      templates.push({
        id: 'time-series-area',
        name: 'Time Series (Area)',
        description: `Area chart of ${numericCol} over time`,
        chartType: 'area',
        xAxis: timeCol,
        yAxis: numericCol,
        requiresTimeSeries: true
      })
    }

    // Template 2: Event frequency over time
    if (dataAnalysis.timeColumns.length > 0) {
      const timeCol = dataAnalysis.timeColumns[0]
      templates.push({
        id: 'event-frequency',
        name: 'Event Frequency',
        description: 'Count events per time period',
        chartType: 'bar',
        xAxis: timeCol,
        yAxis: null, // Will be count
        transform: (data) => {
          // Group by time column and count
          const grouped = data.reduce((acc, row) => {
            const key = String(row[timeCol])
            acc[key] = (acc[key] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          
          return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => {
              const aNum = Number(a.name) || 0
              const bNum = Number(b.name) || 0
              return aNum - bNum
            })
        }
      })
    }

    // Template 3: Distribution (pie chart for categorical)
    if (dataAnalysis.categoricalColumns.length > 0 && dataAnalysis.numericColumns.length > 0) {
      const catCol = dataAnalysis.categoricalColumns[0]
      const numCol = dataAnalysis.numericColumns[0]
      
      templates.push({
        id: 'distribution',
        name: 'Distribution',
        description: `Distribution of ${catCol} by ${numCol}`,
        chartType: 'pie',
        xAxis: catCol,
        yAxis: numCol,
        transform: (data) => {
          // Group by categorical and sum numeric
          const grouped = data.reduce((acc, row) => {
            const key = String(row[catCol] || 'Unknown')
            acc[key] = (acc[key] || 0) + (Number(row[numCol]) || 0)
            return acc
          }, {} as Record<string, number>)
          
          return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .slice(0, 10) // Limit to top 10
        }
      })
    }

    // Template 4: Value comparison (bar chart)
    if (dataAnalysis.categoricalColumns.length > 0 && dataAnalysis.numericColumns.length > 0) {
      const catCol = dataAnalysis.categoricalColumns[0]
      const numCol = dataAnalysis.numericColumns[0]
      
      templates.push({
        id: 'value-comparison',
        name: 'Value Comparison',
        description: `Compare ${numCol} by ${catCol}`,
        chartType: 'bar',
        xAxis: catCol,
        yAxis: numCol,
        transform: (data) => {
          // Group by categorical and sum numeric
          const grouped = data.reduce((acc, row) => {
            const key = String(row[catCol] || 'Unknown')
            acc[key] = (acc[key] || 0) + (Number(row[numCol]) || 0)
            return acc
          }, {} as Record<string, number>)
          
          return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 20) // Limit to top 20
        }
      })
    }

    // Template 5: Multiple series over time (if multiple numeric columns)
    if (dataAnalysis.isTimeSeries && dataAnalysis.numericColumns.length > 1) {
      const timeCol = dataAnalysis.timeColumns[0]
      templates.push({
        id: 'multi-series',
        name: 'Multiple Metrics',
        description: 'Compare multiple metrics over time',
        chartType: 'composed',
        xAxis: timeCol,
        yAxis: null, // Multiple Y axes
        requiresTimeSeries: true
      })
    }

    return templates
  }, [dataAnalysis])

  // Auto-select first two columns if not set
  useMemo(() => {
    if (dataAnalysis && !xAxis && dataAnalysis.columns.length > 0) {
      setXAxis(dataAnalysis.columns[0])
    }
    if (dataAnalysis && !yAxis && dataAnalysis.numericColumns.length > 0) {
      setYAxis(dataAnalysis.numericColumns[0])
    } else if (dataAnalysis && !yAxis && dataAnalysis.columns.length > 1) {
      setYAxis(dataAnalysis.columns[1])
    }
  }, [dataAnalysis, xAxis, yAxis])

  // Apply template
  const applyTemplate = (template: ChartTemplate) => {
    setSelectedTemplate(template.id)
    setChartType(template.chartType)
    if (template.xAxis) setXAxis(template.xAxis)
    if (template.yAxis) setYAxis(template.yAxis)
    setChartTitle(template.name)
    setShowTemplates(false)
  }

  // Prepare chart data
  const chartData = useMemo(() => {
    if (currentData.length === 0) return []

    const template = availableTemplates.find(t => t.id === selectedTemplate)
    
    // If template has transform, use it
    if (template?.transform) {
      return template.transform(currentData)
    }

    // Otherwise, use standard mapping
    if (!xAxis || !yAxis) return []

    return currentData.map((row) => ({
      name: String(row[xAxis] || ''),
      value: Number(row[yAxis]) || 0,
      // Include all numeric columns for multi-series
      ...(dataAnalysis?.numericColumns.reduce((acc, col) => {
        acc[col] = Number(row[col]) || 0
        return acc
      }, {} as Record<string, number>) || {})
    }))
  }, [currentData, xAxis, yAxis, selectedTemplate, availableTemplates, dataAnalysis])

  const renderChart = () => {
    if (currentData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-[var(--ide-text-muted)] text-sm space-y-2">
          <div className="text-lg">📊</div>
          <div>
            {dataSource === 'sql' 
              ? 'Run a SQL query to visualize data' 
              : 'Deploy a contract and call functions to generate events'}
          </div>
          {dataSource === 'sql' && (
            <div className="text-xs mt-2 text-center max-w-md">
              Tip: Write a query that returns time-series or grouped data for best visualizations
            </div>
          )}
        </div>
      )
    }

    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-[var(--ide-text-muted)] text-sm">
          {showTemplates ? 'Select a chart template to get started' : 'Select columns to visualize'}
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
              <XAxis 
                dataKey="name" 
                stroke="#cccccc"
                tick={{ fontSize: 11, fill: '#cccccc' }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#cccccc"
                tick={{ fontSize: 11, fill: '#cccccc' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#252526',
                  border: '1px solid #3e3e42',
                  color: '#cccccc',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#007acc" 
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
              <XAxis 
                dataKey="name" 
                stroke="#cccccc"
                tick={{ fontSize: 11, fill: '#cccccc' }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#cccccc"
                tick={{ fontSize: 11, fill: '#cccccc' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#252526',
                  border: '1px solid #3e3e42',
                  color: '#cccccc',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar 
                dataKey="value" 
                fill="#007acc"
                radius={[4, 4, 0, 0]}
              />
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
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={CHART_COLORS[index % CHART_COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#252526',
                  border: '1px solid #3e3e42',
                  color: '#cccccc',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
              <XAxis 
                dataKey="name" 
                stroke="#cccccc"
                tick={{ fontSize: 11, fill: '#cccccc' }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#cccccc"
                tick={{ fontSize: 11, fill: '#cccccc' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#252526',
                  border: '1px solid #3e3e42',
                  color: '#cccccc',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#007acc" 
                fill="#007acc" 
                fillOpacity={0.6} 
              />
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'composed':
        // Multi-series chart
        const numericCols = dataAnalysis?.numericColumns.slice(0, 3) || []
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart {...chartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
              <XAxis 
                dataKey="name" 
                stroke="#cccccc"
                tick={{ fontSize: 11, fill: '#cccccc' }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#cccccc"
                tick={{ fontSize: 11, fill: '#cccccc' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#252526',
                  border: '1px solid #3e3e42',
                  color: '#cccccc',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {numericCols.map((col, idx) => (
                <Line
                  key={col}
                  type="monotone"
                  dataKey={col}
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )
    }
  }

  return (
    <div className="h-full flex flex-col bg-[var(--ide-editor-bg)]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[var(--ide-border-default)] bg-[var(--ide-sidebar-bg)] px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-[var(--ide-text-primary)]">Chart Builder</h2>
          {dataAnalysis && (
            <div className="text-xs text-[var(--ide-text-muted)]">
              {dataAnalysis.rowCount} rows • {dataAnalysis.columns.length} columns
            </div>
          )}
        </div>
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="text-xs px-2 py-1 rounded bg-[var(--ide-input-bg)] hover:bg-[var(--ide-hover-bg)] text-[var(--ide-text-primary)]"
        >
          {showTemplates ? 'Hide' : 'Show'} Templates
        </button>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Configuration */}
        <div className="w-72 border-r border-[var(--ide-border-default)] bg-[var(--ide-sidebar-bg)] overflow-y-auto flex flex-col">
          {/* Templates Section */}
          {showTemplates && availableTemplates.length > 0 && (
            <div className="p-3 border-b border-[var(--ide-border-default)]">
              <label className="block text-xs font-semibold text-[var(--ide-text-muted)] mb-2 tracking-wider">
                QUICK START TEMPLATES
              </label>
              <div className="space-y-2">
                {availableTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className={`w-full text-left p-2.5 rounded border transition-all ${
                      selectedTemplate === template.id
                        ? 'border-[var(--ide-accent-primary)] bg-[var(--ide-accent-selection)]'
                        : 'border-[var(--ide-border-default)] hover:border-[var(--ide-accent-primary)] hover:bg-[var(--ide-hover-bg)]'
                    }`}
                  >
                    <div className="text-xs font-medium text-[var(--ide-text-primary)] mb-1">
                      {template.name}
                    </div>
                    <div className="text-xs text-[var(--ide-text-muted)]">
                      {template.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 p-3 space-y-4">
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
                  SQL Query Results ({sqlResults.length} rows)
                </button>
                <button
                  onClick={() => setDataSource('events')}
                  className={`w-full text-left px-3 py-1.5 text-xs rounded transition-colors ${
                    dataSource === 'events'
                      ? 'bg-[var(--ide-accent-selection)] text-[var(--ide-text-primary)]'
                      : 'text-[var(--ide-text-muted)] hover:bg-[var(--ide-hover-bg)]'
                  }`}
                >
                  Event History ({eventData.length} rows)
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
            {dataAnalysis && dataAnalysis.columns.length > 0 && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[var(--ide-text-muted)] mb-2 tracking-wider">
                    X-AXIS
                    {dataAnalysis.timeColumns.includes(xAxis) && (
                      <span className="ml-1 text-[var(--ide-accent-primary)]">(time)</span>
                    )}
                  </label>
                  <select
                    value={xAxis}
                    onChange={(e) => setXAxis(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-[var(--ide-input-bg)] border border-[var(--ide-border-default)] rounded text-[var(--ide-text-primary)] focus:border-[var(--ide-accent-primary)] outline-none"
                  >
                    {dataAnalysis.columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--ide-text-muted)] mb-2 tracking-wider">
                    Y-AXIS
                    {dataAnalysis.numericColumns.includes(yAxis) && (
                      <span className="ml-1 text-[var(--ide-accent-primary)]">(numeric)</span>
                    )}
                  </label>
                  <select
                    value={yAxis}
                    onChange={(e) => setYAxis(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-[var(--ide-input-bg)] border border-[var(--ide-border-default)] rounded text-[var(--ide-text-primary)] focus:border-[var(--ide-accent-primary)] outline-none"
                  >
                    {dataAnalysis.columns.map((col) => (
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
            {dataAnalysis && (
              <div className="pt-4 border-t border-[var(--ide-border-default)]">
                <div className="text-xs text-[var(--ide-text-muted)] space-y-1">
                  <div>📊 {dataAnalysis.rowCount} records</div>
                  <div>📋 {dataAnalysis.columns.length} columns</div>
                  {dataAnalysis.isTimeSeries && (
                    <div className="text-[var(--ide-accent-primary)]">⏱️ Time-series data detected</div>
                  )}
                  {dataAnalysis.numericColumns.length > 0 && (
                    <div>{dataAnalysis.numericColumns.length} numeric columns</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Chart Preview */}
        <div className="flex-1 flex flex-col bg-[var(--ide-editor-bg)] min-w-0">
          {chartTitle && (
            <div className="px-4 py-3 border-b border-[var(--ide-border-default)] flex-shrink-0">
              <h2 className="text-sm font-semibold text-[var(--ide-text-primary)]">{chartTitle}</h2>
            </div>
          )}
          <div className="flex-1 p-4 min-h-0">
            {renderChart()}
          </div>
        </div>
      </div>
    </div>
  )
}
