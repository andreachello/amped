import { useState, useMemo } from 'react'
import { useWriteContract } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { privateKeyToAccount } from 'viem/accounts'
import type { Abi, Address } from 'viem'
import type { AbiFunction } from 'abitype'
import { wagmiConfig } from '../lib/config'
import {
  categorizeAbi,
  getParameterDisplayName,
  getInputType,
  getPlaceholder,
  parseInputValue,
  validateInput,
} from '../lib/abiHelpers'

const account = privateKeyToAccount(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
)

interface Props {
  contractAddress: Address
  contractAbi: Abi
}

export function DynamicFunctionButtons({ contractAddress, contractAbi }: Props) {
  const { writeFunctions } = useMemo(() => categorizeAbi(contractAbi), [contractAbi])

  if (writeFunctions.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No write functions available in this contract.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {writeFunctions.map((func) => (
        <FunctionButton
          key={func.name}
          func={func}
          contractAddress={contractAddress}
          contractAbi={contractAbi}
        />
      ))}
    </div>
  )
}

interface FunctionButtonProps {
  func: AbiFunction
  contractAddress: Address
  contractAbi: Abi
}

function FunctionButton({ func, contractAddress, contractAbi }: FunctionButtonProps) {
  const hasInputs = func.inputs && func.inputs.length > 0

  if (!hasInputs) {
    return <SimpleButton func={func} contractAddress={contractAddress} contractAbi={contractAbi} />
  }

  return <ParameterizedButton func={func} contractAddress={contractAddress} contractAbi={contractAbi} />
}

// Simple button for parameter-free functions
function SimpleButton({ func, contractAddress, contractAbi }: FunctionButtonProps) {
  const queryClient = useQueryClient()
  const { writeContract, status, error } = useWriteContract({ config: wagmiConfig })

  const handleClick = () => {
    writeContract(
      {
        abi: contractAbi,
        address: contractAddress,
        functionName: func.name,
        account,
      },
      {
        onSuccess() {
          setTimeout(() => {
            // Invalidate all event table queries
            queryClient.invalidateQueries({
              queryKey: ['Amp', 'Events'],
            })
            // Also invalidate view function queries
            queryClient.invalidateQueries({
              predicate: (query) =>
                Array.isArray(query.queryKey) &&
                query.queryKey[0] === 'contract' &&
                query.queryKey[1] === 'read'
            })
          }, 1_500)
        },
      }
    )
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === 'pending'}
        className="w-full rounded-md bg-[var(--ide-accent-primary)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--ide-accent-focus)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
      >
        {status === 'pending' ? `${func.name}...` : `${func.name}()`}
      </button>
      {error && (
        <div className="mt-1 text-xs text-red-400">{error.message}</div>
      )}
    </div>
  )
}

// Expandable form for parameterized functions
function ParameterizedButton({ func, contractAddress, contractAbi }: FunctionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [args, setArgs] = useState<Record<number, string>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})

  const queryClient = useQueryClient()
  const { writeContract, status, error: txError } = useWriteContract({ config: wagmiConfig })

  const handleInputChange = (index: number, value: string) => {
    setArgs((prev) => ({ ...prev, [index]: value }))

    // Validate on change
    const validation = validateInput(value, func.inputs![index])
    if (!validation.valid) {
      setErrors((prev) => ({ ...prev, [index]: validation.error || 'Invalid input' }))
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[index]
        return newErrors
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all inputs
    const newErrors: Record<number, string> = {}
    func.inputs!.forEach((input, index) => {
      const value = args[index] || ''
      const validation = validateInput(value, input)
      if (!validation.valid) {
        newErrors[index] = validation.error || 'Invalid input'
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Parse arguments
    try {
      const parsedArgs = func.inputs!.map((input, index) => {
        const value = args[index] || ''
        return parseInputValue(value, input.type)
      })

      writeContract(
        {
          abi: contractAbi,
          address: contractAddress,
          functionName: func.name,
          args: parsedArgs,
          account,
        },
        {
          onSuccess() {
            setTimeout(() => {
              // Invalidate all event table queries
              queryClient.invalidateQueries({
                queryKey: ['Amp', 'Events'],
              })
              // Also invalidate view function queries
              queryClient.invalidateQueries({
                predicate: (query) =>
                  Array.isArray(query.queryKey) &&
                  query.queryKey[0] === 'contract' &&
                  query.queryKey[1] === 'read'
              })
              setIsExpanded(false)
              setArgs({})
            }, 1_500)
          },
        }
      )
    } catch (error: any) {
      setErrors({ 0: error.message })
    }
  }

  return (
    <div className="border border-[var(--ide-border-default)] rounded-md bg-[var(--ide-input-bg)]">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left px-3 py-2 hover:bg-[var(--ide-hover-bg)] transition-colors"
      >
        <span className="text-xs font-medium text-[var(--ide-text-primary)]">
          {func.name}({func.inputs!.length})
        </span>
        <svg
          className={`h-3 w-3 text-[var(--ide-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="px-3 pb-3 pt-2 space-y-2 border-t border-[var(--ide-border-default)]">
          {func.inputs!.map((input, index) => {
            const displayName = getParameterDisplayName(input, index)
            const inputType = getInputType(input.type)
            const placeholder = getPlaceholder(input.type)

            return (
              <div key={index}>
                <label className="block text-xs font-medium text-[var(--ide-text-muted)] mb-1">
                  {displayName}
                  <span className="text-[var(--ide-text-muted)] ml-1">({input.type})</span>
                </label>
                {inputType === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={args[index] === 'true' || args[index] === '1'}
                    onChange={(e) => handleInputChange(index, e.target.checked ? 'true' : 'false')}
                    className="h-4 w-4 rounded border-[var(--ide-border-default)]"
                  />
                ) : (
                  <input
                    type={inputType}
                    value={args[index] || ''}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    placeholder={placeholder}
                    className={`block w-full rounded-md bg-[var(--ide-editor-bg)] border-[var(--ide-border-default)] text-[var(--ide-text-primary)] text-xs px-2 py-1.5 focus:border-[var(--ide-accent-primary)] focus:ring-1 focus:ring-[var(--ide-accent-primary)] ${
                      errors[index] ? 'border-red-500' : ''
                    }`}
                  />
                )}
                {errors[index] && (
                  <p className="mt-1 text-xs text-red-400">{errors[index]}</p>
                )}
              </div>
            )
          })}

          <button
            type="submit"
            disabled={status === 'pending'}
            className="w-full mt-2 rounded-md bg-[var(--ide-accent-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--ide-accent-focus)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'pending' ? 'Executing...' : 'Execute'}
          </button>
          {txError && (
            <div className="text-xs text-red-400 mt-1">{txError.message}</div>
          )}
        </form>
      )}
    </div>
  )
}
