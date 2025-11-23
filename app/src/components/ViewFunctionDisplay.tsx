import { useMemo } from 'react'
import { useReadContract } from 'wagmi'
import type { Abi, Address } from 'viem'
import type { AbiFunction } from 'abitype'
import { categorizeAbi, formatReturnValue } from '../lib/abiHelpers'

interface Props {
  contractAddress: Address
  contractAbi: Abi
}

export function ViewFunctionDisplay({ contractAddress, contractAbi }: Props) {
  const { viewFunctions } = useMemo(() => categorizeAbi(contractAbi), [contractAbi])

  if (viewFunctions.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {viewFunctions.map((func) => (
        <ViewFunctionCard
          key={func.name}
          func={func}
          contractAddress={contractAddress}
          contractAbi={contractAbi}
        />
      ))}
    </div>
  )
}

interface ViewFunctionCardProps {
  func: AbiFunction
  contractAddress: Address
  contractAbi: Abi
}

function ViewFunctionCard({ func, contractAddress, contractAbi }: ViewFunctionCardProps) {
  // Only show functions with no inputs for now (to keep it simple)
  const hasInputs = func.inputs && func.inputs.length > 0

  const { data, isLoading, error, refetch } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: func.name,
    args: hasInputs ? undefined : [],
    query: {
      enabled: !hasInputs, // Only auto-fetch for parameter-free functions
      refetchInterval: 5000, // Auto-refresh every 5 seconds
    },
  })

  if (hasInputs) {
    // For functions with parameters, just show the signature
    return (
      <div className="border border-[var(--ide-border-default)] rounded-md p-2 bg-[var(--ide-input-bg)]">
        <div className="text-xs font-medium text-[var(--ide-text-muted)]">
          {func.name}({func.inputs!.length})
        </div>
        <div className="text-xs text-[var(--ide-text-muted)] mt-0.5 italic">
          Requires parameters
        </div>
      </div>
    )
  }

  const outputType = func.outputs?.[0]?.type || 'unknown'

  return (
    <div className="border border-[var(--ide-border-default)] rounded-md p-2 bg-[var(--ide-input-bg)]">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="text-xs font-medium text-[var(--ide-text-primary)]">
            {func.name}()
          </div>
          <div className="text-xs text-[var(--ide-text-muted)] mt-0.5">
            {outputType}
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="text-[var(--ide-accent-primary)] hover:text-[var(--ide-accent-focus)] transition-colors"
          title="Refresh"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      <div>
        {isLoading ? (
          <div className="text-xs text-[var(--ide-text-muted)] italic">Loading...</div>
        ) : error ? (
          <div className="text-xs text-red-400">Error: {error.message}</div>
        ) : (
          <div className="text-sm font-semibold text-[var(--ide-text-primary)] font-mono">
            {formatReturnValue(data, outputType)}
          </div>
        )}
      </div>
    </div>
  )
}
