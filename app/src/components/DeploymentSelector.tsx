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
    return (
      <div className="text-xs text-[var(--ide-text-muted)] italic px-2">
        No deployments yet
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {deployments.map((deployment) => (
        <div
          key={deployment.id}
          className={`group relative ${
            deployment.id === activeDeploymentId
              ? 'bg-[var(--ide-accent-selection)]'
              : 'hover:bg-[var(--ide-hover-bg)]'
          }`}
        >
          <div className="flex items-center">
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
                className="flex-1 bg-[var(--ide-input-bg)] text-[var(--ide-text-primary)] text-xs px-2 py-1 border border-[var(--ide-accent-primary)] rounded outline-none"
                autoFocus
              />
            ) : (
              <button
                onClick={() => onSelectDeployment(deployment)}
                className="flex-1 text-left px-2 py-1.5 min-w-0"
              >
                <div className="flex items-center gap-2">
                  <svg className="h-3 w-3 flex-shrink-0 text-[var(--ide-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-xs text-[var(--ide-text-primary)] truncate flex-1">
                    {deployment.label}
                  </span>
                  {deployment.id === activeDeploymentId && (
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--ide-accent-primary)]" title="Active deployment"></span>
                  )}
                </div>
                <div className="text-xs text-[var(--ide-text-muted)] ml-5 truncate">
                  {formatAddress(deployment.address)}
                </div>
              </button>
            )}

            <div className="flex items-center gap-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleStartEdit(deployment)}
                className="text-[var(--ide-text-muted)] hover:text-[var(--ide-text-primary)] p-0.5 transition-colors"
                title="Rename"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                className="text-[var(--ide-text-muted)] hover:text-red-400 p-0.5 transition-colors"
                title="Delete"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        </div>
      ))}
    </div>
  )
}
