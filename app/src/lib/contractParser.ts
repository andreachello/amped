/**
 * Parses Solidity contract source code to extract function-to-event mappings
 */

export interface FunctionEventMapping {
  [functionName: string]: string[] // event names emitted by this function
}

/**
 * Parses a Solidity contract to find which events each function emits
 * Uses regex to extract emit statements from function bodies
 */
export function parseContractEventMappings(solidityCode: string): FunctionEventMapping {
  const mapping: FunctionEventMapping = {}

  // Match function declarations and their bodies
  // Handles: function name(...) public/external/etc { ... }
  const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s+(?:public|external|private|internal)?[^{]*\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/g

  let match
  while ((match = functionRegex.exec(solidityCode)) !== null) {
    const functionName = match[1]
    const functionBody = match[2]

    // Find all emit statements in this function body
    const emitRegex = /emit\s+(\w+)\s*\(/g
    const events: string[] = []

    let emitMatch
    while ((emitMatch = emitRegex.exec(functionBody)) !== null) {
      const eventName = emitMatch[1]
      if (!events.includes(eventName)) {
        events.push(eventName)
      }
    }

    if (events.length > 0) {
      mapping[functionName] = events
    }
  }

  return mapping
}

/**
 * Infers function-to-event mapping based on name similarity
 * Used as fallback when source code parsing is not available
 */
export function inferFunctionEventMapping(
  functionNames: string[],
  eventNames: string[]
): FunctionEventMapping {
  const mapping: FunctionEventMapping = {}

  // Expanded list of common function verb prefixes
  const commonVerbs = [
    'increment', 'decrement', 'set', 'get', 'add', 'remove', 'update', 'delete',
    'create', 'mint', 'burn', 'transfer', 'approve', 'withdraw', 'deposit',
    'ret', 'return', 'fetch', 'retrieve', 'call', 'execute', 'send', 'receive',
    'claim', 'stake', 'unstake', 'swap', 'buy', 'sell', 'pay', 'refund'
  ]

  functionNames.forEach((funcName) => {
    // Convert function name to stem (e.g., incrementME → increment, retFunc → ret)
    const funcLower = funcName.toLowerCase()
    const verbPattern = new RegExp(`^(${commonVerbs.join('|')}).*`, 'i')
    const funcStem = funcLower.replace(verbPattern, '$1')

    // Find events with similar stems - multiple strategies
    const matchedEvents = eventNames.filter((eventName) => {
      const eventLower = eventName.toLowerCase()
      const eventStem = eventLower.replace(/(ed|d)$/, '') // Remove past tense suffixes

      // Strategy 1: Exact stem match
      if (funcStem === eventStem) return true

      // Strategy 2: Event name contains function stem
      if (eventLower.includes(funcStem)) return true

      // Strategy 3: Function stem contains event stem (for short names)
      if (funcStem.includes(eventStem) && eventStem.length >= 3) return true

      // Strategy 4: Levenshtein-like simple similarity for short names
      if (funcStem.length <= 5 && eventStem.length <= 5) {
        // Check if stems share at least 60% of characters
        const commonChars = funcStem.split('').filter(c => eventStem.includes(c)).length
        return commonChars / Math.max(funcStem.length, eventStem.length) >= 0.6
      }

      return false
    })

    if (matchedEvents.length > 0) {
      mapping[funcName] = matchedEvents
    }
  })

  return mapping
}

/**
 * Gets the best available mapping for a contract
 * Tries parsing first, falls back to inference
 */
export function getContractFunctionEventMapping(
  solidityCode: string,
  functionNames: string[],
  eventNames: string[]
): FunctionEventMapping {
  console.log('🔍 [contractParser] Attempting to map functions to events...')
  console.log('  Functions:', functionNames)
  console.log('  Events:', eventNames)

  // Try parsing the source code first
  const parsedMapping = parseContractEventMappings(solidityCode)
  console.log('  📝 Source code parsing result:', parsedMapping)

  // If we got mappings for all functions, use them
  const allFunctionsMapped = functionNames.every(
    (name) => parsedMapping[name] && parsedMapping[name].length > 0
  )

  if (allFunctionsMapped) {
    console.log('  ✅ All functions mapped via source parsing!')
    return parsedMapping
  }

  // Otherwise, fall back to inference and merge with parsed results
  console.log('  ⚠️ Not all functions mapped, falling back to inference...')
  const inferredMapping = inferFunctionEventMapping(functionNames, eventNames)
  console.log('  🔮 Inference result:', inferredMapping)

  // Merge: prefer parsed mappings, use inferred as fallback
  const mergedMapping: FunctionEventMapping = { ...inferredMapping }
  Object.keys(parsedMapping).forEach((funcName) => {
    if (parsedMapping[funcName].length > 0) {
      mergedMapping[funcName] = parsedMapping[funcName]
    }
  })

  console.log('  📊 Final merged mapping:', mergedMapping)
  return mergedMapping
}
