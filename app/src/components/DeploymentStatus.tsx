interface DeploymentStatusProps {
  status: 'idle' | 'deploying' | 'success' | 'error'
  address?: string
  transactionHash?: string
  error?: string
}

export function DeploymentStatus({
  status,
  address,
  transactionHash,
  error,
}: DeploymentStatusProps) {
  if (status === 'idle') return null

  return (
    <div className="w-full text-xs">
      {status === 'deploying' && (
        <div className="flex items-center gap-1.5 text-[var(--ide-accent-primary)]">
          <svg className="animate-spin h-3 w-3 flex-shrink-0" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Compiling and deploying to Anvil...</span>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-green-400">
            <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Deployed successfully</span>
          </div>
          <div className="text-[var(--ide-text-muted)] pl-4.5">
            <span className="font-mono">{address?.substring(0, 12)}...{address?.substring(address.length - 4)}</span>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-red-400">
            <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Deployment failed</span>
          </div>
          <pre className="text-red-300 bg-[var(--ide-editor-bg)] px-2 py-1 rounded border border-red-900/30 overflow-auto max-h-20 text-xs">
{error}
          </pre>
        </div>
      )}
    </div>
  )
}
