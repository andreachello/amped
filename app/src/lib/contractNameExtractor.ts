/**
 * Extracts the contract name from Solidity source code
 * Matches: contract ContractName {
 */
export function extractContractName(solidityCode: string): string | null {
  // Match "contract Name {" pattern
  const contractRegex = /contract\s+([A-Z][a-zA-Z0-9_]*)\s*(?:is\s+[^{]+)?\s*\{/;
  const match = solidityCode.match(contractRegex);

  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Validates that a contract name exists in the Solidity code
 */
export function validateContractExists(solidityCode: string): {
  valid: boolean;
  contractName: string | null;
  error?: string
} {
  const contractName = extractContractName(solidityCode);

  if (!contractName) {
    return {
      valid: false,
      contractName: null,
      error: 'No valid contract definition found. Contract must start with "contract Name {"'
    };
  }

  return {
    valid: true,
    contractName
  };
}

/**
 * Generates a dataset name from contract name and timestamp
 * Example: MyToken -> eth_global/mytoken_1234567890@dev
 */
export function generateDatasetName(contractName: string, timestamp?: number): string {
  const ts = timestamp || Date.now();
  const normalizedName = contractName.toLowerCase();
  return `eth_global/${normalizedName}_${ts}@dev`;
}

/**
 * Converts contract name to filename
 * Example: MyToken -> MyToken.sol
 */
export function contractNameToFilename(contractName: string): string {
  return `${contractName}.sol`;
}
