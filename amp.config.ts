import type { AmpConfig } from '@edgeandnode/amp'

const config: AmpConfig = {
  contracts: [
    {
      abiFile: './contracts/out/Counkter.sol/Counkter.json',
    }
  ],
  sources: {
    'Counkter_1763863997982': 'anvil',
  },
  namespace: 'eth_global',
  name: 'counkter_1763863997982'
}

export default config
