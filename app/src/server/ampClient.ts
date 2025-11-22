import { createConnectTransport } from "@connectrpc/connect-web";
import { createAuthInterceptor, createClient } from "@edgeandnode/amp";

// Use process.env for Node.js environment
// Server needs absolute URL since it doesn't have Vite's proxy
const baseUrl = process.env.AMP_SERVER_URL || "http://localhost:8080";

const transport = createConnectTransport({
  baseUrl,
  /**
   * If present, adds your VITE_AMP_QUERY_TOKEN env var to the interceptor path.
   * This adds it to the connect-rpc transport layer and is passed to requests.
   * This is REQUIRED for querying published datasets through the gateway
   */
  interceptors: process.env.VITE_AMP_QUERY_TOKEN
    ? [createAuthInterceptor(process.env.VITE_AMP_QUERY_TOKEN)]
    : undefined,
});

export const ampClient = createClient(transport);

/**
 * Performs the given query with the AmpClient instance.
 * Waits for all batches to complete/resolve before returning.
 * Includes a 5-second timeout to prevent hanging on non-existent tables.
 * @param query the query to run
 * @returns an array of the results from all resolved batches
 */
export async function performAmpQuery<T = any>(
  query: string
): Promise<Array<T>> {
  const QUERY_TIMEOUT = 5000; // 5 seconds

  return await Promise.race([
    // The actual query
    new Promise<Array<T>>(async (resolve, reject) => {
      try {
        const data: Array<T> = [];

        for await (const batch of ampClient.query(query)) {
          data.push(...batch);
        }

        resolve(data);
      } catch (error) {
        // Reject the promise so callers can handle the error
        reject(error);
      }
    }),
    // Timeout promise
    new Promise<Array<T>>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Query timeout after ${QUERY_TIMEOUT}ms - table may not exist yet`));
      }, QUERY_TIMEOUT);
    }),
  ]);
}

export const RPC_SOURCE =
  process.env.VITE_AMP_RPC_DATASET || "_/anvil@0.0.1";

export const EVENTS_DATASET =
  process.env.VITE_AMP_EVENTS_DATASET || "eth_global/counter@dev";
