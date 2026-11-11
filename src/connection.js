import Micropub from 'micropub-helper'
import helper from './helpers'
import relParser from 'rel-parser'

// IndieAuth client identity follows the origin that serves this reader.
export const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || window.location.origin + '/'
export const SCOPE = 'create post channels timeline'

export function saveConnectionEndpoints(endpoints) {
  window.localStorage.setItem('endpoints', JSON.stringify(endpoints))
}

export function beginConnection(me, redirectUri) {
  const state = helper.generateState()
  const micropub = new Micropub({
    clientId: CLIENT_ID,
    redirectUri,
    me,
    state,
    scope: SCOPE
  })
  return micropub.getAuthUrl(false).then(url => {
    saveConnectionEndpoints({loginState: state})
    return {url, state}
  })
}

// Complete the callback and return data for the store to persist. Keeping this
// protocol code out of the modal makes it replaceable by a host-provided session.
export async function completeConnection(query, expectedState) {
  const code = query.code
  const me = query.me
  if (!code || !me) throw new Error('Missing IndieAuth callback parameters.')
  if (!expectedState || query.state !== expectedState) throw new Error('IndieAuth state did not match.')

  const rels = await relParser(me)
  const first = value => Array.isArray(value) ? value[0] : value
  const endpoints = {
    token_endpoint: first(rels.token_endpoint),
    auth_endpoint: first(rels.authorization_endpoint || rels.auth_endpoint),
    micropub: first(rels.micropub),
    microsub: first(rels.microsub)
  }
  if (!endpoints.token_endpoint) throw new Error('The website has no IndieAuth token endpoint.')

  const micropub = new Micropub({
    clientId: CLIENT_ID,
    redirectUri: window.location.origin + '/callback',
    me,
    state: expectedState,
    scope: SCOPE
  })
  micropub.options = {
    tokenEndpoint: endpoints.token_endpoint,
    authEndpoint: endpoints.auth_endpoint,
    micropubEndpoint: endpoints.micropub
  }

  const accessToken = await micropub.getToken(code)
  return {
    endpoints: {
      tokenEndpoint: endpoints.token_endpoint,
      authEndpoint: endpoints.auth_endpoint,
      micropubEndpoint: endpoints.micropub,
      microsubEndpoint: endpoints.microsub
    },
    token: {access_token: accessToken, me: micropub.options.me, scope: micropub.options.scope}
  }
}
