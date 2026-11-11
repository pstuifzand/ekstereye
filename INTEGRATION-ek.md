# Ek local-reader connection adapter

`src/ekConnection.js` is the replacement for the browser-owned IndieAuth flow in
`src/connection.js`. It deliberately does not return or persist an access token.
Ek owns IndieAuth, credential storage, and authenticated upstream requests; the
reader uses Ek's same-origin Microsub proxy.

## Local HTTP contract

All routes are same-origin under `/_ek/api`, use `credentials: same-origin`, and
must not be exposed on a non-loopback listener by default.

### `GET /_ek/api/connection`

Returns `Cache-Control: no-store` JSON:

```json
{
  "connected": true,
  "me": "https://example.com/",
  "microsubEndpoint": "/_ek/api/microsub",
  "micropubEndpoint": "/_ek/api/micropub"
}
```

When disconnected, return `{"connected":false}`. Do not include the upstream
token, authorization endpoint, or any credential material.

### `POST /_ek/api/connection`

JSON body: `{"me":"https://example.com/"}`. Ek validates the URL, discovers
IndieAuth/Microsub endpoints, and starts authorization. Return
`{"authorization_url":"https://…"}`. Ek should use a one-time state value and
its loopback callback, persist the resulting token and endpoint in Ek's usual
config, then redirect back to the reader. The UI can call `getConnection()` on
return to refresh state.

### `DELETE /_ek/api/connection`

Clear Ek's saved connection and return 204. The reader must also clear its
in-memory channel/timeline state.

### `GET/POST /_ek/api/microsub?action=…`

Proxy the standard Microsub request to the configured endpoint, retaining query
parameters, method, content type, and request body. Ek adds the upstream bearer
token itself. The upstream target must come only from Ek's saved discovered
endpoint—not from any browser parameter. Stream the `events` action as SSE.
Return upstream status and appropriate content type. On lost/expired credentials,
return 401 so Ekstereye can show its reconnect state.

The Micropub proxy at `GET/POST /_ek/api/micropub` forwards only to Ek's saved
Micropub endpoint and adds Ek's saved bearer token, supporting reader features
such as configuration queries and post actions.

The endpoints are same-origin, so no permissive CORS headers are needed. Restrict
request methods to the methods Ekstereye uses and never implement this as a
user-controlled URL proxy.

## Integration seam

Swap the import of `@/connection` for `@/ekConnection` in `LoginModal.vue`, then
replace the current callback/token persistence handling with `getConnection()`.
The Vuex store should use the `microsubEndpoint` and `micropubEndpoint` from
that response and omit the `token` option on requests to the local proxies. The current adapter is kept
separate until Ek implements the HTTP contract above, so the standalone reader
continues to use its existing IndieAuth connection flow.
