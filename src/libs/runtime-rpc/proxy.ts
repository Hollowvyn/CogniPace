/** Typed RPC proxy over chrome.runtime.sendMessage.
 *
 *  The SW exposes a flat object of async handlers (`swApi`). The UI creates
 *  a typed proxy: `const api = createSwClient<typeof swApi>()`. Method calls
 *  are forwarded as `{ method, payload }` envelopes. On success, the proxy
 *  resolves with the handler's return value; on failure it throws an Error
 *  carrying the handler's error message.
 *
 *  This replaces the hand-rolled sendMessage + MessageRequestMap god-file +
 *  per-message validator switch. The handler signatures ARE the wire contract. */

/** Wire envelope shared by both sides. */
export interface RpcResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/** Wire request the SW receives. */
export interface RpcRequest {
  method: string;
  payload: unknown;
}

/** Extracts the resolved payload type from a handler's Promise return. */
type Resolved<F> = F extends (...args: never[]) => Promise<infer R> ? R : never;

/** Mirrors the SW api but typed so calls return the resolved data directly
 *  (the proxy unwraps the envelope and throws on failure). */
type RpcClient<T> = {
  [K in keyof T]: T[K] extends (payload: infer P, ...rest: never[]) => Promise<unknown>
    ? (payload: P) => Promise<Resolved<T[K]>>
    : never;
};

async function callSw(method: string, payload: unknown): Promise<unknown> {
  let response: RpcResponse | undefined;
  try {
    response = (await chrome.runtime.sendMessage({ method, payload } satisfies RpcRequest)) as
      | RpcResponse
      | undefined;
  } catch (err) {
    throw new Error((err as Error).message || "Extension background request failed.");
  }
  if (!response) throw new Error("Extension background did not return a response.");
  if (!response.ok) throw new Error(response.error || "Handler returned no error message.");
  return response.data;
}

/** Builds a typed Proxy that forwards method calls to the SW.
 *  `T` is the shape of the SW api (`typeof swApi`). */
export function createSwClient<T extends Record<string, (...args: never[]) => Promise<unknown>>>(): RpcClient<T> {
  return new Proxy({} as RpcClient<T>, {
    get: (_target, method: string) => (payload: unknown) => callSw(method, payload),
  });
}
