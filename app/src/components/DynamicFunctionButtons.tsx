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
    <div className="flex flex-row flex-wrap gap-3">
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
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === 'pending'}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {status === 'pending' ? `${func.name}...` : func.name}()
      </button>
      {error && (
        <span className="text-xs text-red-600">{error.message}</span>
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
    <div className="border border-gray-300 rounded-lg p-3">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="font-medium text-sm">
          {func.name}({func.inputs!.length} {func.inputs!.length === 1 ? 'param' : 'params'})
        </span>
        <svg
          className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          {func.inputs!.map((input, index) => {
            const displayName = getParameterDisplayName(input, index)
            const inputType = getInputType(input.type)
            const placeholder = getPlaceholder(input.type)

            return (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-700">
                  {displayName}
                  <span className="text-gray-500 text-xs ml-2">({input.type})</span>
                </label>
                {inputType === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={args[index] === 'true' || args[index] === '1'}
                    onChange={(e) => handleInputChange(index, e.target.checked ? 'true' : 'false')}
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                  />
                ) : (
                  <input
                    type={inputType}
                    value={args[index] || ''}
                    onChange={(e) => handleInputChange(index, e.target.value)}
                    placeholder={placeholder}
                    className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                      errors[index] ? 'border-red-500' : ''
                    }`}
                  />
                )}
                {errors[index] && (
                  <p className="mt-1 text-xs text-red-600">{errors[index]}</p>
                )}
              </div>
            )
          })}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={status === 'pending'}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {status === 'pending' ? 'Executing...' : `Execute ${func.name}`}
            </button>
            {txError && (
              <span className="text-xs text-red-600">{txError.message}</span>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
