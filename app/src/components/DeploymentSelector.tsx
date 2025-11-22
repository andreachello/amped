import { useState, useEffect } from 'react'
import type { DeploymentRecord } from '../lib/deploymentHistory'
import {
  loadDeployments,
  removeDeployment,
  updateDeploymentLabel,
  formatAddress,
  formatTimestamp,
} from '../lib/deploymentHistory'

interface Props {
  activeDeploymentId: string | null
  onSelectDeployment: (deployment: DeploymentRecord) => void
}

export function DeploymentSelector({ activeDeploymentId, onSelectDeployment }: Props) {
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')

  // Load deployments on mount and when activeDeploymentId changes
  useEffect(() => {
    setDeployments(loadDeployments())
  }, [activeDeploymentId])

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this deployment from history?')) {
      removeDeployment(id)
      setDeployments(loadDeployments())
    }
  }

  const handleStartEdit = (deployment: DeploymentRecord) => {
    setEditingId(deployment.id)
    setEditLabel(deployment.label || '')
  }

  const handleSaveLabel = (id: string) => {
    if (editLabel.trim()) {
      updateDeploymentLabel(id, editLabel.trim())
      setDeployments(loadDeployments())
    }
    setEditingId(null)
    setEditLabel('')
  }

  if (deployments.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        Deployment History ({deployments.length})
      </h3>
      <div className="space-y-2">
        {deployments.map((deployment) => (
          <div
            key={deployment.id}
            className={`border rounded-lg p-3 transition-colors ${
              deployment.id === activeDeploymentId
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {editingId === deployment.id ? (
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onBlur={() => handleSaveLabel(deployment.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveLabel(deployment.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    className="block w-full text-sm font-medium border-gray-300 rounded"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => onSelectDeployment(deployment)}
                    className="text-left w-full"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {deployment.label}
                      </span>
                      {deployment.id === activeDeploymentId && (
                        <span className="inline-flex items-center rounded-md bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatAddress(deployment.address)}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {formatTimestamp(deployment.timestamp)}
                    </div>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleStartEdit(deployment)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Edit label"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(deployment.id)}
                  className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
                  title="Delete"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {deployment.transactionHash && (
              <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 font-mono">
                Tx: {deployment.transactionHash.slice(0, 10)}...{deployment.transactionHash.slice(-8)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
