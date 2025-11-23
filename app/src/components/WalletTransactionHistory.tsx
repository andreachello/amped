import { useState } from 'react'
import type { Address } from 'viem'
import { useWalletTransactions } from '../hooks/useWalletTransactions'
import { formatWalletAddress, getTransactionType } from '../lib/walletHelpers'

interface Props {
  walletAddress?: Address
}

export function WalletTransactionHistory({ walletAddress }: Props) {
  const [page, setPage] = useState(0)
  const { data: transactions, isLoading } = useWalletTransactions(walletAddress, page)

  const hasData = (transactions?.length || 0) > 0
  const hasNextPage = (transactions?.length || 0) === 10
  const hasPrevPage = page > 0

  return (
    <div className="mt-4">
      <div className="sm:flex sm:items-center mb-3">
        <div className="sm:flex-auto">
          <h3 className="text-base font-semibold text-[var(--ide-text-primary)]">
            Transaction History
          </h3>
          <p className="text-xs text-[var(--ide-text-muted)] mt-1">
            All transactions sent from or received by this wallet
          </p>
        </div>
      </div>

      <div className="mt-3 flow-root">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full py-2 align-middle">
            {isLoading ? (
              <div className="text-sm text-[var(--ide-text-muted)] py-4">Loading transactions...</div>
            ) : !hasData ? (
              <div className="text-sm text-[var(--ide-text-muted)] py-4">
                No transactions yet for this wallet
              </div>
            ) : (
              <table className="min-w-full divide-y divide-[var(--ide-border-default)]">
                <thead>
                  <tr>
                    <th className="py-2 pr-2 pl-0 text-left text-xs font-semibold text-[var(--ide-text-primary)]">
                      Block
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--ide-text-primary)]">
                      Type
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--ide-text-primary)]">
                      To
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--ide-text-primary)]">
                      From
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--ide-text-primary)]">
                      TX Hash
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--ide-text-primary)]">
                      Nonce
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ide-border-default)]">
                  {transactions?.map((tx, index) => {
                    const txType = getTransactionType(tx, walletAddress!)
                    return (
                      <tr key={`${tx.tx_hash}-${index}`} className="hover:bg-[var(--ide-hover-bg)]">
                        <td className="py-2 pr-2 pl-0 text-xs font-medium whitespace-nowrap text-[var(--ide-text-primary)]">
                          {tx.block_num}
                        </td>
                        <td className="px-2 py-2 text-xs whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                              txType === 'Received'
                                ? 'bg-green-500/20 text-green-400'
                                : txType === 'Sent'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-purple-500/20 text-purple-400'
                            }`}
                          >
                            {txType}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-xs whitespace-nowrap font-mono text-[var(--ide-text-primary)]">
                          {tx.to ? formatWalletAddress(`0x${tx.to}` as Address) : 'Contract Creation'}
                        </td>
                        <td className="px-2 py-2 text-xs whitespace-nowrap font-mono text-[var(--ide-text-primary)]">
                          {formatWalletAddress(`0x${tx.from}` as Address)}
                        </td>
                        <td className="px-2 py-2 text-xs whitespace-nowrap font-mono text-[var(--ide-text-muted)]">
                          {formatWalletAddress(`0x${tx.tx_hash}` as Address)}
                        </td>
                        <td className="px-2 py-2 text-xs whitespace-nowrap text-[var(--ide-text-primary)]">
                          {tx.nonce}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {hasData && (
        <div className="flex items-center justify-between border-t border-[var(--ide-border-default)] px-4 py-3 sm:px-0 mt-4">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={!hasPrevPage}
              className="relative inline-flex items-center rounded-md border border-[var(--ide-border-default)] bg-[var(--ide-input-bg)] px-4 py-2 text-sm font-medium text-[var(--ide-text-primary)] hover:bg-[var(--ide-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNextPage}
              className="relative ml-3 inline-flex items-center rounded-md border border-[var(--ide-border-default)] bg-[var(--ide-input-bg)] px-4 py-2 text-sm font-medium text-[var(--ide-text-primary)] hover:bg-[var(--ide-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-[var(--ide-text-muted)]">
                Page <span className="font-medium">{page + 1}</span>
                {hasData && <span> • {transactions?.length} results</span>}
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={!hasPrevPage}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-[var(--ide-text-muted)] ring-1 ring-inset ring-[var(--ide-border-default)] hover:bg-[var(--ide-hover-bg)] focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasNextPage}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-[var(--ide-text-muted)] ring-1 ring-inset ring-[var(--ide-border-default)] hover:bg-[var(--ide-hover-bg)] focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
