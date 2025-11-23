import type { Address } from 'viem'
import { WalletSelector } from './WalletSelector'
import { WalletMetricsCards } from './WalletMetricsCards'
import { WalletActivityCharts } from './WalletActivityCharts'
import { ContractInteractionsTimeline } from './ContractInteractionsTimeline'
import { WalletTransactionHistory } from './WalletTransactionHistory'

interface Props {
  selectedWallet: Address
  onWalletChange: (wallet: Address) => void
}

export function WalletDashboard({ selectedWallet, onWalletChange }: Props) {
  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Sidebar - Wallet Selector and Filters */}
      <div className="w-64 flex-shrink-0 border-r border-[var(--ide-border-default)] p-4 overflow-y-auto">
        <WalletSelector
          selectedWallet={selectedWallet}
          onWalletChange={onWalletChange}
        />

        <div className="mt-6">
          <div className="text-xs font-semibold text-[var(--ide-text-muted)] mb-3 tracking-wider">
            FILTERS
          </div>
          <div className="space-y-2">
            <label className="flex items-center text-sm text-[var(--ide-text-primary)]">
              <input
                type="checkbox"
                defaultChecked
                className="mr-2 rounded border-[var(--ide-border-default)]"
              />
              <span>Sent</span>
            </label>
            <label className="flex items-center text-sm text-[var(--ide-text-primary)]">
              <input
                type="checkbox"
                defaultChecked
                className="mr-2 rounded border-[var(--ide-border-default)]"
              />
              <span>Received</span>
            </label>
            <label className="flex items-center text-sm text-[var(--ide-text-primary)]">
              <input
                type="checkbox"
                defaultChecked
                className="mr-2 rounded border-[var(--ide-border-default)]"
              />
              <span>Contract Interactions</span>
            </label>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs font-semibold text-[var(--ide-text-muted)] mb-3 tracking-wider">
            INFO
          </div>
          <div className="text-xs text-[var(--ide-text-muted)] space-y-2">
            <p>View wallet transaction history, contract interactions, and activity metrics.</p>
            <p className="text-[var(--ide-accent-primary)]">
              Select a wallet from the dropdown above to analyze.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="border-b border-[var(--ide-border-default)] pb-4">
            <h1 className="text-2xl font-bold text-[var(--ide-text-primary)]">
              Wallet Analytics
            </h1>
            <p className="text-sm text-[var(--ide-text-muted)] mt-1">
              Comprehensive wallet insights and transaction analysis
            </p>
          </div>

          {/* Metrics Cards */}
          <WalletMetricsCards walletAddress={selectedWallet} />

          {/* Activity Charts */}
          <WalletActivityCharts walletAddress={selectedWallet} />

          {/* Contract Interactions */}
          <ContractInteractionsTimeline walletAddress={selectedWallet} />

          {/* Transaction History */}
          <WalletTransactionHistory walletAddress={selectedWallet} />
        </div>
      </div>
    </div>
  )
}
