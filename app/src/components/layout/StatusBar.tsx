import type { Address } from 'viem'

interface StatusBarProps {
  contractAddress?: Address
  contractName?: string
  network: string
  walletAddress: Address
  blockNumber?: number
  isConnected: boolean
}

export function StatusBar({
  contractAddress,
  contractName = 'Counter.sol',
  network,
  walletAddress,
  blockNumber,
  isConnected
}: StatusBarProps) {
  const formatAddress = (addr: Address) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  return (
    <div className="h-6 bg-[var(--ide-accent-primary)] text-white flex items-center justify-between px-3 text-xs">
      <div className="flex items-center space-x-4">
        {contractAddress && (
          <div className="flex items-center space-x-2">
            <span className="font-medium">{contractName}</span>
            <span className="opacity-75">({formatAddress(contractAddress)})</span>
          </div>
        )}
        <div className="opacity-75">{network}</div>
        <div className="opacity-75">Wallet: {formatAddress(walletAddress)}</div>
      </div>

      <div className="flex items-center space-x-4">
        {blockNumber !== undefined && (
          <div className="opacity-75">Block: {blockNumber}</div>
        )}
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--ide-success)]' : 'bg-[var(--ide-error)]'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  )
}
