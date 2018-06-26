const express = require('express')
const morgan = require('morgan')
const fs = require('fs')
const _ = require('underscore')
const session = require('express-session')
const randomstring = require('randomstring')
const bodyParser = require('body-parser')

const ui = _.template(fs.readFileSync('./src/input.html').toString())

const app = express()
app.use(
  morgan(
    ':method :url :status Authorization: :req[authorization] Debug info: :res[x-debug] Redirect: :res[location]'
  )
)
app.use(bodyParser.urlencoded({ extended: false }))

const DEFAULTS = {
  EXPECTED_CLIENT_ID: 'dummy-client-id',
  EXPECTED_CLIENT_SECRET: 'dummy-client-secret',
  AUTH_REQUEST_PATH: '/o/oauth2/v2/auth',
  ACCESS_TOKEN_REQUEST_PATH: '/oauth2/v4/token',
  USERINFO_REQUEST_URL: '/oauth2/v3/userinfo',
  TOKENINFO_REQUEST_URL: '/oauth2/v3/tokeninfo'
}

const {
  EXPECTED_CLIENT_ID,
  EXPECTED_CLIENT_SECRET,
  AUTH_REQUEST_PATH,
  ACCESS_TOKEN_REQUEST_PATH,
  USERINFO_REQUEST_URL,
  TOKENINFO_REQUEST_URL
} = Object.assign({}, DEFAULTS, process.env)

const PERMITTED_REDIRECT_URLS = process.env.PERMITTED_REDIRECT_URLS
  ? process.env.PERMITTED_REDIRECT_URLS.split(',')
  : ['http://localhost:8181/auth/login']

const SCOPES = process.env.SCOPES ? process.env.SCOPES.split(',') : []

const MATCH_SCOPE = process.env.MATCH_SCOPE
  ? process.env.MATCH_SCOPE.split(',').reduce((acc, elem) => {
      const [email, scope] = elem.split(':')
      acc[email] = scope
      return acc
    }, {})
  : {}

const getScope = email => {
  if (SCOPES.length === 0) return null
  const sKeys = Object.keys(MATCH_SCOPE)
  if (sKeys.length === 0) return SCOPES[0]
  const found = sKeys.find(key => email.includes(key))
  if (!found) return SCOPES[0]
  return MATCH_SCOPE[found]
}

const code2token = {}
const authHeader2personData = {}
const token2personData = {}

const errorMsg = (descr, expected, actual) =>
  `expected ${descr}: ${expected}, actual: ${actual}`

const validateClientId = (actualClientId, res) => {
  if (actualClientId === EXPECTED_CLIENT_ID) {
    return true
  }
  res.writeHead(400, {
    'X-Debug': errorMsg('client_id', EXPECTED_CLIENT_ID, actualClientId)
  })
  res.end()
  return false
}

const permittedRedirectURLs = () =>
  _.reduce(PERMITTED_REDIRECT_URLS, (a, b) => (a === '' ? b : a + ', ' + b), '')

const validateAuthRequest = (req, res) => {
  const actualClientId = req.query.client_id

  if (validateClientId(actualClientId, res)) {
    if (req.query.response_type !== 'code') {
      res.writeHead(401, {
        'X-Debug': errorMsg('response_type', 'code', req.query.response_type)
      })
      return false
    }
    if (
      req.query.redirect_uri &&
      !_.contains(PERMITTED_REDIRECT_URLS, req.query.redirect_uri)
    ) {
      res.writeHead(401, {
        'X-Debug': errorMsg(
          'redirect_uri',
          `one of ${permittedRedirectURLs()}`,
          req.query.redirect_uri
        )
      })
      return false
    }
    return true
  }
  return false
}

const validateAuthorizationHeader = (header, res) => {
  header = header.trim()
  if (!header.startsWith('Basic ')) return false

  header = header.substring('Basic '.length).trim()
  const decoded = Buffer.from(header, 'base64').toString('ascii')
  if (decoded === '') return false

  const segments = decoded.split(':')
  if (segments.length !== 2) return false
  if (segments[0] !== EXPECTED_CLIENT_ID) return false
  if (segments[1] !== EXPECTED_CLIENT_SECRET) return false
  return true
}

const validateAccessTokenRequest = (req, res) => {
  let success = true
  let msg

  if (req.body.grant_type !== 'authorization_code') {
    success = false
    msg = errorMsg('grant_type', 'authorization_code', req.body.grant_type)
    console.log(msg)
  }

  if (!validateClientId(req.body.client_id, res)) success = false

  if (req.body.client_secret !== EXPECTED_CLIENT_SECRET) {
    success = false
    msg = errorMsg(
      'client_secret',
      EXPECTED_CLIENT_SECRET,
      req.body.client_secret
    )
  }

  if (req.session.redirect_uri !== req.body.redirect_uri) {
    success = false
    msg = errorMsg(
      'redirect_uri',
      req.session.redirect_uri,
      req.body.redirect_uri
    )
  }

  if (!success) {
    const params = {}
    if (msg) params['X-Debug'] = msg

    res.writeHead(401, params)
  }
  return success
}

const createToken = (name, email, expiresIn, state, scope) => {
  const code = 'C-' + randomstring.generate(3)
  const accesstoken = 'ACCT-' + randomstring.generate(6)
  const refreshtoken = 'REFT-' + randomstring.generate(6)
  const idToken = 'IDT-' + randomstring.generate(6)
  const token = {
    access_token: accesstoken,
    expires_in: expiresIn,
    refresh_token: refreshtoken,
    id_token: idToken,
    state,
    token_type: 'Bearer'
  }
  const key = `Bearer ${accesstoken}`
  authHeader2personData[key] = {
    email,
    email_verified: true,
    name
  }
  if (SCOPES.length > 0) {
    authHeader2personData[key].scope = scope || getScope(email)
    token.scope = authHeader2personData[key].scope
  }
  token2personData[idToken] = authHeader2personData[key]
  code2token[code] = token
  return code
}

app.use(
  session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  })
)

const authRequestHandler = (req, res) => {
  if (validateAuthRequest(req, res)) {
    req.session.redirect_uri = req.query.redirect_uri
    if (req.query.state) {
      req.session.client_state = req.query.state
    }
    res.send(ui({ query: req.query }))
  }
  res.end()
}

app.get(AUTH_REQUEST_PATH, authRequestHandler)

app.get('/login-as', (req, res) => {
  const code = createToken(
    req.query.name,
    req.query.email,
    req.query.expiresIn,
    req.session.client_state,
    req.query.scope
  )
  let location = `${req.session.redirect_uri}?code=${code}`
  if (req.session.client_state) location += `&state=${req.session.client_state}`
  console.log('Redirecting to', location)
  console.log(
    'Retrieve Auth Token by post',
    ACCESS_TOKEN_REQUEST_PATH,
    'with code',
    code,
    'client_id',
    EXPECTED_CLIENT_ID,
    'client_secret',
    EXPECTED_CLIENT_SECRET,
    'grant_type authorization_code',
    'with header "Content-Type: application/x-www-form-urlencoded"'
  )
  res.writeHead(307, { Location: location })
  res.end()
})

app.post(ACCESS_TOKEN_REQUEST_PATH, (req, res) => {
  if (validateAccessTokenRequest(req, res)) {
    const code = req.body.code
    const token = code2token[code]
    if (token !== undefined) {
      console.log('access token response body: ', token)
      res.send(token)
    }
  }
  res.end()
})

app.get(USERINFO_REQUEST_URL, (req, res) => {
  const userInfo = authHeader2personData[req.headers['authorization']]
  if (userInfo !== undefined) {
    console.log('userinfo response', userInfo)
    res.send(userInfo)
  } else {
    res.status(404)
  }
  res.end()
})

app.get(TOKENINFO_REQUEST_URL, (req, res) => {
  if (req.query.idToken == null) {
    res.status(400)
    res.send('missing idToken query parameter')
  }
  const tokenInfo = token2personData[req.query.idToken]
  if (tokenInfo !== undefined) {
    res.status(200)
    res.send(tokenInfo)
  } else {
    res.status(404)
    res.send('token not found by idToken ' + req.query.idToken)
  }
  res.end()
})

module.exports = {
  app,
  validateClientId,
  validateAccessTokenRequest,
  validateAuthorizationHeader,
  validateAuthRequest,
  authRequestHandler,
  EXPECTED_CLIENT_ID,
  EXPECTED_CLIENT_SECRET,
  AUTH_REQUEST_PATH,
  ACCESS_TOKEN_REQUEST_PATH,
  PERMITTED_REDIRECT_URLS,
  permittedRedirectURLs,
  SCOPES,
  MATCH_SCOPE
}
