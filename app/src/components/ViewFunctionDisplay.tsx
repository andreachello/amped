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
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        Contract State (View Functions)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {viewFunctions.map((func) => (
          <ViewFunctionCard
            key={func.name}
            func={func}
            contractAddress={contractAddress}
            contractAbi={contractAbi}
          />
        ))}
      </div>
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
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {func.name}({func.inputs!.length} params)
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Requires parameters
        </div>
      </div>
    )
  }

  const outputType = func.outputs?.[0]?.type || 'unknown'

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {func.name}()
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {outputType}
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          title="Refresh"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>

      <div className="mt-2">
        {isLoading ? (
          <div className="text-sm text-gray-400 italic">Loading...</div>
        ) : error ? (
          <div className="text-sm text-red-600">Error: {error.message}</div>
        ) : (
          <div className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
            {formatReturnValue(data, outputType)}
          </div>
        )}
      </div>
    </div>
  )
}
