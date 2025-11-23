import type { Address } from 'viem'
import { useContractInteractions } from '../hooks/useContractInteractions'
import { formatWalletAddress } from '../lib/walletHelpers'

interface Props {
  walletAddress?: Address
}

export function ContractInteractionsTimeline({ walletAddress }: Props) {
  const { data: interactions, isLoading } = useContractInteractions(walletAddress)

  return (
    <div className="mt-4">
      <div className="sm:flex sm:items-center mb-3">
        <div className="sm:flex-auto">
          <h3 className="text-base font-semibold text-[var(--ide-text-primary)]">
            Contract Interactions
          </h3>
          <p className="text-xs text-[var(--ide-text-muted)] mt-1">
            Contracts this wallet has interacted with
          </p>
        </div>
      </div>

      <div className="mt-3 flow-root">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full py-2 align-middle">
            {isLoading ? (
              <div className="text-sm text-[var(--ide-text-muted)] py-4">Loading interactions...</div>
            ) : !interactions || interactions.length === 0 ? (
              <div className="text-sm text-[var(--ide-text-muted)] py-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                <div className="font-medium mb-1">Feature temporarily unavailable</div>
                <div className="text-xs">Contract interaction tracking requires subquery support which is not currently available in this Amp setup.</div>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-[var(--ide-border-default)]">
                <thead>
                  <tr>
                    <th className="py-2 pr-2 pl-0 text-left text-xs font-semibold text-[var(--ide-text-primary)]">
                      Contract Address
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--ide-text-primary)]">
                      Interactions
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--ide-text-primary)]">
                      First Block
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--ide-text-primary)]">
                      Last Block
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ide-border-default)]">
                  {interactions.map((interaction, index) => (
                    <tr key={`${interaction.address}-${index}`} className="hover:bg-[var(--ide-hover-bg)]">
                      <td className="py-2 pr-2 pl-0 text-xs font-mono whitespace-nowrap text-[var(--ide-text-primary)]">
                        {formatWalletAddress(`0x${interaction.address}` as Address)}
                      </td>
                      <td className="px-2 py-2 text-xs whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded bg-[var(--ide-accent-primary)]/20 text-[var(--ide-accent-primary)] text-xs font-medium">
                          {interaction.count}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-xs whitespace-nowrap text-[var(--ide-text-muted)]">
                        {interaction.first_block}
                      </td>
                      <td className="px-2 py-2 text-xs whitespace-nowrap text-[var(--ide-text-muted)]">
                        {interaction.last_block}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
