# Fake OAuth2 Server

A fake `OAuth2` server implementation for testing purposes. See [RFC 6749](https://tools.ietf.org/html/rfc6749).

It is useful for you if you are developing an OAuth2 client application and want to stub the server for integration testing purposes, or if you are developing a service that needs OAuth2 but you don't want to pollute your real OAuth2 server with dummy credentials.

In this context the subject under test (SUT) is your client application and this project can act as a stub of the external OAuth service, which your application is supposed to use.

By testing I mean automated end-to-end testing or manual testing, not unit testing.

Currently under development.

## Building & running

 - clone this repo
 - run `npm install`
 - start the server using `npm start`
 - you can run the unit tests using `npm test`

## Docker

You can build this as a docker container

    docker build -t oauth .

Or use the supplied `docker-compose` file

    docker-compose up -d oauth

## Configuration

The application can be configured using *environment variables* before executing `npm start` . The default configuration matches the relative URIs of the google OAuth2 implementation.

List of environment variables:

|Variable name|Default value|Description|
|--------------|------------|----------|
|`PORT`|8282|The port the server listens on|
|`EXPECTED_CLIENT_ID`|`dummy-client-id`|The [client identifier](https://tools.ietf.org/html/rfc6749#section-2.2) which your SUT should send to the OAuth2 server in authentication requests and access token requests.|
|`EXPECTED_CLIENT_SECRET`|`dummy-client-secret`|The [client secret](https://tools.ietf.org/html/rfc6749#section-2.3.1) which your SUT should send to the OAuth2 server in access token requests.|
|`AUTH_REQUEST_PATH`|`/o/oauth2/v2/auth`|The HTTP path of the OAuth2 [authorization endpoint](https://tools.ietf.org/html/rfc6749#section-3.1) which the fake server listens on|
|`ACCESS_TOKEN_REQUEST_PATH`|`/oauth2/v4/token`|The HTTP path of the [access token request](https://tools.ietf.org/html/rfc6749#section-4.1.3) which the fake server listens on|
|`PERMITTED_REDIRECT_URLS`|`http://localhost:8181/auth/login`|comma-separated list of permitted [redirection endpoints](https://tools.ietf.org/html/rfc6749#section-3.1.2)|
|`USERINFO_REQUEST_URL`|`'/oauth2/v3/userinfo'`| The url to retrieve user info from. |
|`TOKENINFO_REQUEST_URL`|`'/oauth2/v3/tokeninfo'`| The url to retrieve token information from.  |
|`SCOPES`| | A comma-separated list of scopes that can be returned. The first scope will be the default scope |
|`MATCH_SCOPE`| | Email fragments and their associated scopes.  E.g. `"MATCH_SCOPE" : "@admin:admin"` will tell the oAuth server to give anyone with email address `*@admin*` the scope `'admin'` |

## Contributing

Please see the [contributing notes](CONTRIBUTING.md).
