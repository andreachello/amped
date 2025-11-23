import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const CHART_COLORS = ['#007acc', '#00bfff', '#1e90ff', '#4169e1']

const exampleData = [
  { name: 'Block 100', value: 5 },
  { name: 'Block 200', value: 12 },
  { name: 'Block 300', value: 8 },
  { name: 'Block 400', value: 15 },
  { name: 'Block 500', value: 20 },
]

export function ExampleCharts() {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-[var(--ide-text-muted)] mb-2 tracking-wider">
          EXAMPLE CHARTS
        </h3>
        <div className="text-xs text-[var(--ide-text-muted)] mb-3">
          Preview of available chart types
        </div>
      </div>

      {/* Line Chart Example */}
      <div className="border border-[var(--ide-border-default)] rounded p-2 bg-[var(--ide-input-bg)]">
        <div className="text-xs font-medium text-[var(--ide-text-primary)] mb-2">Line Chart</div>
        <ResponsiveContainer width="100%" height={100}>
          <LineChart data={exampleData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
            <XAxis dataKey="name" tick={false} stroke="#cccccc" />
            <YAxis tick={{ fontSize: 10, fill: '#cccccc' }} stroke="#cccccc" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#252526',
                border: '1px solid #3e3e42',
                color: '#cccccc',
                fontSize: '10px'
              }}
            />
            <Line type="monotone" dataKey="value" stroke="#007acc" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart Example */}
      <div className="border border-[var(--ide-border-default)] rounded p-2 bg-[var(--ide-input-bg)]">
        <div className="text-xs font-medium text-[var(--ide-text-primary)] mb-2">Bar Chart</div>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart data={exampleData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
            <XAxis dataKey="name" tick={false} stroke="#cccccc" />
            <YAxis tick={{ fontSize: 10, fill: '#cccccc' }} stroke="#cccccc" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#252526',
                border: '1px solid #3e3e42',
                color: '#cccccc',
                fontSize: '10px'
              }}
            />
            <Bar dataKey="value" fill="#007acc" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart Example */}
      <div className="border border-[var(--ide-border-default)] rounded p-2 bg-[var(--ide-input-bg)]">
        <div className="text-xs font-medium text-[var(--ide-text-primary)] mb-2">Pie Chart</div>
        <ResponsiveContainer width="100%" height={100}>
          <PieChart>
            <Pie
              data={exampleData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={35}
            >
              {exampleData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#252526',
                border: '1px solid #3e3e42',
                color: '#cccccc',
                fontSize: '10px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Area Chart Example */}
      <div className="border border-[var(--ide-border-default)] rounded p-2 bg-[var(--ide-input-bg)]">
        <div className="text-xs font-medium text-[var(--ide-text-primary)] mb-2">Area Chart</div>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={exampleData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#3e3e42" />
            <XAxis dataKey="name" tick={false} stroke="#cccccc" />
            <YAxis tick={{ fontSize: 10, fill: '#cccccc' }} stroke="#cccccc" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#252526',
                border: '1px solid #3e3e42',
                color: '#cccccc',
                fontSize: '10px'
              }}
            />
            <Area type="monotone" dataKey="value" stroke="#007acc" fill="#007acc" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-2 border-t border-[var(--ide-border-default)]">
        <div className="text-xs text-[var(--ide-text-muted)] space-y-1">
          <div>• Select data source</div>
          <div>• Choose chart type</div>
          <div>• Map columns to axes</div>
          <div>• View live preview</div>
        </div>
      </div>
    </div>
  )
}
