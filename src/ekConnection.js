// Connection adapter for Ek's local reader host.
//
// The host owns IndieAuth and its access token. The browser only receives the
// connected user's identity and a same-origin Microsub proxy URL; it must never
// receive an upstream access token.
const API_BASE = '/_ek/api'

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(API_BASE + path, {
      method: options.method || 'GET',
      headers: {'Content-Type': 'application/json', ...(options.headers || {})},
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store'
    })
  } catch (error) {
    throw new Error('Could not reach Ek. Is the local reader server running?', {cause: error})
  }

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Ek answered ${response.status}.`)
  }
  if (response.status === 204) return null
  return response.json()
}

/** Return {connected, me, microsubEndpoint}; no access token is returned. */
export function getConnection() {
  return request('/connection')
}

/** Ask Ek to begin IndieAuth and navigate to its authorization URL. */
export async function beginConnection(me) {
  const result = await request('/connection', {
    method: 'POST',
    body: {me}
  })
  if (!result || !result.authorization_url) {
    throw new Error('Ek did not provide an authorization URL.')
  }
  window.location.assign(result.authorization_url)
}

/** Remove the connection from Ek's local credential store. */
export function disconnect() {
  return request('/connection', {method: 'DELETE'})
}

export default {getConnection, beginConnection, disconnect}
