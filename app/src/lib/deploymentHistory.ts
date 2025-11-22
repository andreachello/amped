import type { Abi, Address } from 'viem'

export interface DeploymentRecord {
  id: string
  timestamp: number
  address: Address
  abi: Abi
  transactionHash: string
  label?: string
}

const STORAGE_KEY = 'amp-deployment-history'

/**
 * Saves deployment history to localStorage
 */
export function saveDeployments(deployments: DeploymentRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deployments))
  } catch (error) {
    console.error('Failed to save deployment history:', error)
  }
}

/**
 * Loads deployment history from localStorage
 */
export function loadDeployments(): DeploymentRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Failed to load deployment history:', error)
    return []
  }
}

/**
 * Adds a new deployment to history
 */
export function addDeployment(
  address: Address,
  abi: Abi,
  transactionHash: string,
  label?: string
): DeploymentRecord {
  const deployment: DeploymentRecord = {
    id: `${Date.now()}-${address}`,
    timestamp: Date.now(),
    address,
    abi,
    transactionHash,
    label: label || `Contract ${new Date().toLocaleTimeString()}`,
  }

  const existing = loadDeployments()
  const updated = [...existing, deployment]
  saveDeployments(updated)

  return deployment
}

/**
 * Removes a deployment from history
 */
export function removeDeployment(id: string): void {
  const existing = loadDeployments()
  const updated = existing.filter((d) => d.id !== id)
  saveDeployments(updated)
}

/**
 * Updates a deployment's label
 */
export function updateDeploymentLabel(id: string, label: string): void {
  const existing = loadDeployments()
  const updated = existing.map((d) => (d.id === id ? { ...d, label } : d))
  saveDeployments(updated)
}

/**
 * Gets a deployment by ID
 */
export function getDeploymentById(id: string): DeploymentRecord | undefined {
  const deployments = loadDeployments()
  return deployments.find((d) => d.id === id)
}

/**
 * Clears all deployment history
 */
export function clearDeployments(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear deployment history:', error)
  }
}

/**
 * Formats deployment address for display
 */
export function formatAddress(address: string): string {
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Formats timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString()
}
