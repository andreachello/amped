import { useState } from 'react'
import type { Address } from 'viem'
import { ANVIL_ACCOUNTS, formatWalletAddress, getAccountLabel } from '../lib/walletHelpers'

interface Props {
  selectedWallet: Address
  onWalletChange: (wallet: Address) => void
}

export function WalletSelector({ selectedWallet, onWalletChange }: Props) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [customAddress, setCustomAddress] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  const handleSelectWallet = (wallet: Address) => {
    onWalletChange(wallet)
    setShowDropdown(false)
    setShowCustomInput(false)
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (customAddress && customAddress.startsWith('0x') && customAddress.length === 42) {
      onWalletChange(customAddress as Address)
      setShowDropdown(false)
      setShowCustomInput(false)
      setCustomAddress('')
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(selectedWallet)
  }

  return (
    <div className="relative">
      <div className="text-xs font-semibold text-[var(--ide-text-muted)] mb-2 tracking-wider">
        WALLET ADDRESS
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm bg-[var(--ide-input-bg)] border border-[var(--ide-border-default)] rounded-md text-[var(--ide-text-primary)] hover:bg-[var(--ide-hover-bg)] transition-colors"
          >
            <div className="flex flex-col items-start">
              <span className="text-xs text-[var(--ide-text-muted)]">
                {getAccountLabel(selectedWallet) || 'Custom Address'}
              </span>
              <span className="font-mono text-xs">
                {formatWalletAddress(selectedWallet)}
              </span>
            </div>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDropdown && (
            <div className="absolute z-50 mt-1 w-full bg-[var(--ide-sidebar-bg)] border border-[var(--ide-border-default)] rounded-md shadow-lg max-h-64 overflow-y-auto">
              {ANVIL_ACCOUNTS.map((wallet, index) => (
                <button
                  key={wallet}
                  onClick={() => handleSelectWallet(wallet)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--ide-hover-bg)] transition-colors ${
                    wallet.toLowerCase() === selectedWallet.toLowerCase()
                      ? 'bg-[var(--ide-accent-primary)] text-white'
                      : 'text-[var(--ide-text-primary)]'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs text-[var(--ide-text-muted)]">Account #{index}</span>
                    <span className="font-mono text-xs">{formatWalletAddress(wallet)}</span>
                  </div>
                </button>
              ))}

              <div className="border-t border-[var(--ide-border-default)] p-2">
                {!showCustomInput ? (
                  <button
                    onClick={() => setShowCustomInput(true)}
                    className="w-full px-3 py-2 text-sm text-[var(--ide-accent-primary)] hover:bg-[var(--ide-hover-bg)] rounded transition-colors"
                  >
                    + Custom Address
                  </button>
                ) : (
                  <form onSubmit={handleCustomSubmit} className="space-y-2">
                    <input
                      type="text"
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      placeholder="0x..."
                      className="w-full px-3 py-2 text-xs bg-[var(--ide-input-bg)] border border-[var(--ide-border-default)] rounded text-[var(--ide-text-primary)]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="flex-1 px-3 py-1 text-xs bg-[var(--ide-accent-primary)] text-white rounded hover:bg-[var(--ide-accent-focus)] transition-colors"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomInput(false)
                          setCustomAddress('')
                        }}
                        className="flex-1 px-3 py-1 text-xs border border-[var(--ide-border-default)] rounded text-[var(--ide-text-primary)] hover:bg-[var(--ide-hover-bg)] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={copyToClipboard}
          className="p-2 text-[var(--ide-text-muted)] hover:text-[var(--ide-text-primary)] hover:bg-[var(--ide-hover-bg)] rounded transition-colors"
          title="Copy address"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>

      {/* Close dropdown when clicking outside */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowDropdown(false)
            setShowCustomInput(false)
          }}
        />
      )}
    </div>
  )
}
