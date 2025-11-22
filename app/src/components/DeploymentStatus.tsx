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
    <div className="w-full mt-4 p-4 rounded-lg border">
      {status === 'deploying' && (
        <div className="text-blue-600">
          <p className="font-semibold">Deploying contract...</p>
          <p className="text-sm text-gray-600 mt-1">
            Compiling Solidity and broadcasting to Anvil
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-green-600">
          <p className="font-semibold">✅ Deployment successful!</p>
          <div className="mt-2 space-y-1 text-sm">
            <p>
              <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                {address}
              </span>
            </p>
            {transactionHash && (
              <p className="text-gray-600">
                Tx: <span className="font-mono">{transactionHash}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="text-red-600">
          <p className="font-semibold">❌ Deployment failed</p>
          <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto max-h-32">
            {error}
          </pre>
        </div>
      )}
    </div>
  )
}
