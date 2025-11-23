import type { Address } from 'viem'
import { useWalletMetrics } from '../hooks/useWalletMetrics'
import { formatLargeNumber } from '../lib/walletHelpers'

interface Props {
  walletAddress?: Address
}

export function WalletMetricsCards({ walletAddress }: Props) {
  const { data: metrics, isLoading } = useWalletMetrics(walletAddress)

  const cards = [
    {
      label: 'Total Transactions',
      value: metrics?.txCount || 0,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    },
    {
      label: 'Contracts Interacted',
      value: metrics?.contractsInteracted || 0,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      label: 'Recent Activity',
      value: metrics?.recentActivity || 0,
      sublabel: 'Last 10 blocks',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-[var(--ide-sidebar-bg)] border border-[var(--ide-border-default)] rounded-md p-4 hover:border-[var(--ide-accent-primary)] transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-xs text-[var(--ide-text-muted)] mb-1">
                {card.label}
              </div>
              {isLoading ? (
                <div className="h-8 w-16 bg-[var(--ide-hover-bg)] animate-pulse rounded" />
              ) : (
                <div className="text-2xl font-bold text-[var(--ide-text-primary)]">
                  {formatLargeNumber(card.value)}
                </div>
              )}
              {card.sublabel && (
                <div className="text-xs text-[var(--ide-text-muted)] mt-1">
                  {card.sublabel}
                </div>
              )}
            </div>
            <div className="text-[var(--ide-accent-primary)] opacity-70">
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
