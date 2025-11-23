import type { Abi, Address } from 'viem'
import { useMemo } from 'react'
import { categorizeAbi } from '../lib/abiHelpers'
import { DynamicFunctionButtons } from './DynamicFunctionButtons'

interface Props {
  contractAddress: Address
  contractAbi: Abi
}

export function ContractFunctions({ contractAddress, contractAbi }: Props) {
  const { writeFunctions } = useMemo(() => categorizeAbi(contractAbi), [contractAbi])

  if (writeFunctions.length === 0) {
    return (
      <div className="text-xs text-[var(--ide-text-muted)] italic">
        No write functions available
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <DynamicFunctionButtons
        contractAddress={contractAddress}
        contractAbi={contractAbi}
      />
    </div>
  )
}
