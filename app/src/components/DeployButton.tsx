import { useState } from 'react'

interface DeployButtonProps {
  code: string
  onDeployStart: () => void
  onDeploySuccess: (result: DeploymentResult) => void
  onDeployError: (error: string) => void
}

interface DeploymentResult {
  success: boolean
  address?: string
  abi?: any[]
  transactionHash?: string
  logs?: string
}

export function DeployButton({
  code,
  onDeployStart,
  onDeploySuccess,
  onDeployError,
}: DeployButtonProps) {
  const [isDeploying, setIsDeploying] = useState(false)

  const handleDeploy = async () => {
    setIsDeploying(true)
    onDeployStart()

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Deployment failed')
      }

      onDeploySuccess(result)
    } catch (error: any) {
      onDeployError(error.message)
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <button
      onClick={handleDeploy}
      disabled={isDeploying}
      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
    >
      {isDeploying ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
          Deploying...
        </span>
      ) : (
        'Deploy Contract'
      )}
    </button>
  )
}
