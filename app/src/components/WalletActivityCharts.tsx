import { useState } from 'react'
import type { Address } from 'viem'
import { useWalletActivityTimeline } from '../hooks/useWalletActivityTimeline'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'

interface Props {
  walletAddress?: Address
}

type ChartType = 'line' | 'bar'

export function WalletActivityCharts({ walletAddress }: Props) {
  const { data: timeline, isLoading } = useWalletActivityTimeline(walletAddress)
  const [chartType, setChartType] = useState<ChartType>('line')

  // Transform data for charts
  const chartData = timeline?.map(point => ({
    block: parseInt(point.block_num),
    transactions: parseInt(point.tx_count),
  })) || []

  return (
    <div className="mt-4">
      <div className="sm:flex sm:items-center justify-between mb-3">
        <div className="sm:flex-auto">
          <h3 className="text-base font-semibold text-[var(--ide-text-primary)]">
            Activity Timeline
          </h3>
          <p className="text-xs text-[var(--ide-text-muted)] mt-1">
            Transaction activity over time
          </p>
        </div>

        <div className="flex gap-2 mt-2 sm:mt-0">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              chartType === 'line'
                ? 'bg-[var(--ide-accent-primary)] text-white'
                : 'bg-[var(--ide-input-bg)] text-[var(--ide-text-primary)] hover:bg-[var(--ide-hover-bg)]'
            }`}
          >
            Line Chart
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              chartType === 'bar'
                ? 'bg-[var(--ide-accent-primary)] text-white'
                : 'bg-[var(--ide-input-bg)] text-[var(--ide-text-primary)] hover:bg-[var(--ide-hover-bg)]'
            }`}
          >
            Bar Chart
          </button>
        </div>
      </div>

      <div className="bg-[var(--ide-sidebar-bg)] border border-[var(--ide-border-default)] rounded-md p-4">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-[var(--ide-text-muted)]">
            Loading chart data...
          </div>
        ) : !chartData || chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-[var(--ide-text-muted)]">
            No activity data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="block"
                  stroke="#888"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#888"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e1e',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="transactions"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={{ fill: '#60a5fa', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis
                  dataKey="block"
                  stroke="#888"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#888"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e1e1e',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    fontSize: '12px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Bar
                  dataKey="transactions"
                  fill="#60a5fa"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
