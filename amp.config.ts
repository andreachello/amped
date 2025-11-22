import { defineDataset, eventTables } from "@edgeandnode/amp"
import { readFileSync } from "fs"
import { resolve } from "path"

export default defineDataset(() => {
  // Dynamically read ABI from the compiled contract
  // This ensures we always use the latest ABI, even when new events are added
  const abiPath = resolve(__dirname, './contracts/out/Counter.sol/Counter.json')
  const abiData = JSON.parse(readFileSync(abiPath, 'utf-8'))
  const abi = abiData.abi

  return {
    namespace: "eth_global", // replace this with a namespace of your choosing that will be a grouping of your datasets
    name: "counter",
    // readme: `
    // # eth_global/counter.
    //
    // provide additional, helpful details about your dataset, its purpose and usage.
    // `,
    // description: "High-level description of your dataset and its use-case/purpose",
    keywords: ["ETHGlobal"], // Add other keywords that help define/explain your dataset
    // sources: ["0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"],
    network: process.env.VITE_AMP_NETWORK || "anvil",
    dependencies: {
      rpc: process.env.VITE_AMP_RPC_DATASET || "_/anvil@0.0.1",
    },
    tables: eventTables(abi, "rpc"),
  }
})
