// One place for the reader's HTTP calls, so every request reports the same failures
// instead of the timeline quietly rendering an empty list when the token has expired.

export class ApiError extends Error {
  constructor(message, status, url) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.url = url
  }
}

let unauthorizedHandler = null

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler
}

function buildHeaders(headers, token) {
  const result = Object.assign({}, headers)
  if (token) {
    result.Authorization = 'Bearer ' + token
  }
  return result
}

/**
 * @param {string} url
 * @param {{method?: string, token?: string, keepalive?: boolean, headers?: object, body?: any}} [options]
 */
export async function request(url, options = {}) {
  const { method = 'GET', token, keepalive = false, headers, body = null } = options

  let response
  try {
    response = await fetch(url, {
      method: method,
      keepalive: keepalive,
      body: body,
      headers: buildHeaders(headers, token)
    })
  } catch (error) {
    throw new ApiError('Could not reach the server.', 0, url)
  }

  if (response.status === 401) {
    const unauthorized = new ApiError('Your session expired. Sign in again.', 401, url)
    if (unauthorizedHandler) {
      unauthorizedHandler(unauthorized)
    }
    throw unauthorized
  }

  if (!response.ok) {
    throw new ApiError('The server answered ' + response.status + '.', response.status, url)
  }

  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new ApiError('The server sent something that is not JSON.', response.status, url)
  }
}

export default { request, setUnauthorizedHandler, ApiError }
