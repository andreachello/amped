import type { Abi, AbiFunction, AbiEvent, AbiParameter } from 'abitype'

/**
 * Categorizes ABI items into write functions, view functions, and events
 */
export function categorizeAbi(abi: Abi) {
  const writeFunctions: AbiFunction[] = []
  const viewFunctions: AbiFunction[] = []
  const events: AbiEvent[] = []

  abi.forEach((item) => {
    if (item.type === 'function') {
      if (item.stateMutability === 'view' || item.stateMutability === 'pure') {
        viewFunctions.push(item as AbiFunction)
      } else if (item.stateMutability === 'nonpayable' || item.stateMutability === 'payable') {
        writeFunctions.push(item as AbiFunction)
      }
    } else if (item.type === 'event') {
      events.push(item as AbiEvent)
    }
  })

  return { writeFunctions, viewFunctions, events }
}

/**
 * Maps Solidity types to HTML input types
 */
export function getInputType(solidityType: string): string {
  if (solidityType.startsWith('uint') || solidityType.startsWith('int')) {
    return 'number'
  }
  if (solidityType === 'bool') {
    return 'checkbox'
  }
  if (solidityType === 'address' || solidityType.startsWith('bytes') || solidityType === 'string') {
    return 'text'
  }
  if (solidityType.includes('[]')) {
    return 'text' // Arrays as comma-separated or JSON
  }
  return 'text'
}

/**
 * Parses input value to appropriate type for contract call
 */
export function parseInputValue(value: string, solidityType: string): any {
  if (!value) return undefined

  if (solidityType.startsWith('uint') || solidityType.startsWith('int')) {
    try {
      return BigInt(value)
    } catch {
      throw new Error(`Invalid number: ${value}`)
    }
  }

  if (solidityType === 'bool') {
    return value === 'true' || value === '1' || value === 'on'
  }

  if (solidityType.includes('[]')) {
    // Try parsing as JSON array first
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        // Parse each element based on base type
        const baseType = solidityType.replace('[]', '')
        return parsed.map(v => parseInputValue(String(v), baseType))
      }
    } catch {
      // Fall back to comma-separated
      const baseType = solidityType.replace('[]', '')
      return value.split(',').map(v => parseInputValue(v.trim(), baseType))
    }
  }

  // address, bytes, string
  return value
}

/**
 * Validates input value against Solidity type
 */
export function validateInput(value: string, param: AbiParameter): { valid: boolean; error?: string } {
  if (!value && !param.type.startsWith('uint') && param.type !== 'bool') {
    return { valid: false, error: 'Value is required' }
  }

  try {
    // Address validation
    if (param.type === 'address') {
      if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
        return { valid: false, error: 'Invalid address format (must be 0x + 40 hex chars)' }
      }
    }

    // Uint validation
    if (param.type.startsWith('uint')) {
      const parsed = BigInt(value)
      if (parsed < 0n) {
        return { valid: false, error: 'Unsigned integers must be >= 0' }
      }

      // Check bit size
      const bits = parseInt(param.type.replace('uint', '')) || 256
      const maxValue = (1n << BigInt(bits)) - 1n
      if (parsed > maxValue) {
        return { valid: false, error: `Value exceeds max for ${param.type}` }
      }
    }

    // Int validation
    if (param.type.startsWith('int') && !param.type.startsWith('uint')) {
      const parsed = BigInt(value)
      const bits = parseInt(param.type.replace('int', '')) || 256
      const maxValue = (1n << (BigInt(bits) - 1n)) - 1n
      const minValue = -(1n << (BigInt(bits) - 1n))
      if (parsed > maxValue || parsed < minValue) {
        return { valid: false, error: `Value out of range for ${param.type}` }
      }
    }

    // Bytes validation
    if (param.type.startsWith('bytes') && param.type !== 'bytes') {
      const size = parseInt(param.type.replace('bytes', ''))
      if (!/^0x[a-fA-F0-9]*$/.test(value)) {
        return { valid: false, error: 'Bytes must be hex string (0x...)' }
      }
      const byteLength = (value.length - 2) / 2
      if (byteLength !== size) {
        return { valid: false, error: `Expected ${size} bytes, got ${byteLength}` }
      }
    }

    // Array validation
    if (param.type.includes('[]')) {
      try {
        parseInputValue(value, param.type)
      } catch (e: any) {
        return { valid: false, error: `Invalid array: ${e.message}` }
      }
    }

    return { valid: true }
  } catch (e: any) {
    return { valid: false, error: e.message }
  }
}

/**
 * Formats a view function return value for display
 */
export function formatReturnValue(value: any, outputType: string): string {
  if (value === null || value === undefined) return 'N/A'

  if (typeof value === 'bigint') {
    return value.toString()
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  if (Array.isArray(value)) {
    return `[${value.map(v => formatReturnValue(v, outputType)).join(', ')}]`
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

/**
 * Gets a display-friendly name for a parameter
 */
export function getParameterDisplayName(param: AbiParameter, index: number): string {
  if (param.name) return param.name
  return `param${index}`
}

/**
 * Gets placeholder text for an input based on type
 */
export function getPlaceholder(solidityType: string): string {
  if (solidityType.startsWith('uint') || solidityType.startsWith('int')) {
    return '0'
  }
  if (solidityType === 'address') {
    return '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
  }
  if (solidityType === 'bool') {
    return 'true/false'
  }
  if (solidityType === 'string') {
    return 'Enter text...'
  }
  if (solidityType.startsWith('bytes')) {
    return '0x...'
  }
  if (solidityType.includes('[]')) {
    return '[1, 2, 3] or 1,2,3'
  }
  return 'Enter value...'
}
