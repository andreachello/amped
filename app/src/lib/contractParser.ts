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

  functionNames.forEach((funcName) => {
    // Convert function name to stem (e.g., incrementME → increment)
    const funcStem = funcName
      .toLowerCase()
      .replace(/^(increment|decrement|set|get|add|remove|update|delete|create|mint|burn|transfer|approve|withdraw|deposit).*/, '$1')

    // Find events with similar stems
    const matchedEvents = eventNames.filter((eventName) => {
      const eventStem = eventName
        .toLowerCase()
        .replace(/(ed|d)$/, '') // Remove past tense suffixes

      return funcStem === eventStem || eventName.toLowerCase().includes(funcStem)
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
  // Try parsing the source code first
  const parsedMapping = parseContractEventMappings(solidityCode)

  // If we got mappings for all functions, use them
  const allFunctionsMapped = functionNames.every(
    (name) => parsedMapping[name] && parsedMapping[name].length > 0
  )

  if (allFunctionsMapped) {
    return parsedMapping
  }

  // Otherwise, fall back to inference and merge with parsed results
  const inferredMapping = inferFunctionEventMapping(functionNames, eventNames)

  // Merge: prefer parsed mappings, use inferred as fallback
  const mergedMapping: FunctionEventMapping = { ...inferredMapping }
  Object.keys(parsedMapping).forEach((funcName) => {
    if (parsedMapping[funcName].length > 0) {
      mergedMapping[funcName] = parsedMapping[funcName]
    }
  })

  return mergedMapping
}
