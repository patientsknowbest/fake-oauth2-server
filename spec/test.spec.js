/**
 * Created by erosb on 2017.04.26..
 */
const sut = require('src/app')
const httpMocks = require('node-mocks-http')

function base64Encode(str) {
  return Buffer.from(str).toString('base64')
}

function resp() {
  return httpMocks.createResponse()
}

function authRequest(query) {
  let request = httpMocks.createRequest({
    method: 'GET',
    url: '/o/oauth2/v2/auth',
    query: query
  })
  request.session = {}
  return request
}

function accessTokenRequest(
  body = {
    client_id: sut.EXPECTED_CLIENT_ID,
    client_secret: sut.EXPECTED_CLIENT_SECRET,
    grant_type: 'authorization_code',
    redirect_uri: 'http://localhost:8181/auth/login'
  },
  headers = {
    Authorization:
      'Basic ' +
      base64Encode(sut.EXPECTED_CLIENT_ID + ':' + sut.EXPECTED_CLIENT_SECRET)
  }
) {
  let request = httpMocks.createRequest({
    method: 'GET',
    url: '/oauth2/v4/token',
    headers: headers,
    body: body
  })
  request.session = {}
  return request
}

describe('validateClientId', () => {
  it('accepts expected', () => {
    const res = httpMocks.createResponse()
    expect(sut.validateClientId(sut.EXPECTED_CLIENT_ID, res)).toBe(true)
  })

  it('refuses others', () => {
    const res = httpMocks.createResponse()
    expect(sut.validateClientId('something else', res)).toBe(false)
    expect(res.statusCode).toBe(400)
  })
})

describe('validateAuthorizationHeader', () => {
  it("is false if doesn't start with 'Basic'", () => {
    expect(sut.validateAuthorizationHeader('asd')).toBe(false)
  })

  it('is false if it cannot be base64-decoded', () => {
    expect(sut.validateAuthorizationHeader('Basic #&@#&@')).toBe(false)
  })

  it('is false without base64-encoded suffix', () => {
    expect(sut.validateAuthorizationHeader('Basic')).toBe(false)
  })

  it('is false if decoded doesnt contain :', () => {
    expect(
      sut.validateAuthorizationHeader(
        'Basic ' + base64Encode(sut.EXPECTED_CLIENT_ID)
      )
    ).toBe(false)
  })

  it('returns false if the 1st segment is not the expected client id', () => {
    const header = 'Basic ' + base64Encode('asd: ' + sut.EXPECTED_CLIENT_SECRET)
    expect(sut.validateAuthorizationHeader(header)).toBe(false)
  })

  it('returns false if the 2nd segment is not the expected client secret', () => {
    const header = 'Basic ' + base64Encode(sut.EXPECTED_CLIENT_ID + ':asd')
    expect(sut.validateAuthorizationHeader(header)).toBe(false)
  })
})
describe('validateAuthRequest', () => {
  it('requires a valid client id', () => {
    const request = authRequest({
      client_id: 'something invalid',
      response_type: 'code'
    })
    expect(sut.validateAuthRequest(request, resp())).toBe(false)
  })

  it('requires response_type=code', () => {
    const request = authRequest({
      client_id: sut.EXPECTED_CLIENT_ID,
      response_type: 'something else'
    })
    expect(sut.validateAuthRequest(request, resp())).toBe(false)
  })

  it('requires the redirect URI to be valid', () => {
    const request = authRequest({
      client_id: sut.EXPECTED_CLIENT_ID,
      response_type: 'code',
      redirect_uri: 'http://x.y.z'
    })
    expect(sut.validateAuthRequest(request, resp())).toBe(false)
  })

  it('is true for valid request without redirect_uri', () => {
    const request = authRequest({
      client_id: sut.EXPECTED_CLIENT_ID,
      response_type: 'code'
    })
    expect(sut.validateAuthRequest(request, resp())).toBe(true)
  })

  it('is true for valid request with redirect_uri', () => {
    const request = authRequest({
      client_id: sut.EXPECTED_CLIENT_ID,
      response_type: 'code',
      redirect_uri: 'http://localhost:8181/auth/login'
    })
    expect(sut.validateAuthRequest(request, resp())).toBe(true)
  })
})

describe('validateAccessTokenRequest', () => {
  it('accepts expected client_id and client_secret', () => {
    const request = accessTokenRequest()
    request.session.redirect_uri = 'http://localhost:8181/auth/login'
    expect(
      sut.validateAccessTokenRequest(request, httpMocks.createResponse())
    ).toBe(true)
  })

  it('is false for invalid authorization header', () => {
    const base64EncodedAuthCode = base64Encode(
      sut.EXPECTED_CLIENT_ID + ':wrOOOONGG!!'
    )
    const request = accessTokenRequest(
      { client_id: sut.EXPECTED_CLIENT_ID, grant_type: 'authorization_code' },
      { Authorization: 'Basic ' + base64EncodedAuthCode }
    )
    const res = httpMocks.createResponse()

    expect(sut.validateAccessTokenRequest(request, res)).toBe(false)
    expect(res.statusCode).toBe(401)
  })

  it('expects the same redirect_uri as it was sent in auth request', () => {
    const request = authRequest({
      client_id: sut.EXPECTED_CLIENT_ID,
      response_type: 'code',
      redirect_uri: 'http://localhost:8181/auth/login'
    })
    sut.authRequestHandler(request, resp())

    expect(request.session.redirect_uri).toEqual(
      'http://localhost:8181/auth/login'
    )

    const accessTokenReq = accessTokenRequest({
      client_id: sut.EXPECTED_CLIENT_ID,
      client_secret: sut.EXPECTED_CLIENT_SECRET,
      grant_type: 'authorization_code'
    })
    accessTokenReq.session = request.session
    expect(sut.validateAccessTokenRequest(accessTokenReq, resp())).toBe(false)
  })
})
