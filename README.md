# Fake OAuth2

This project is an OAuth2 server implementation for testing purposes. See [RFC 6749](https://tools.ietf.org/html/rfc6749) .  

It is useful for you if you are developing an OAuth2 client application and want to stub the server for testing purposes.
In this context the subject under testing (SUT) is your client application and this project can act as a stub of the external OAuth service,
which your application is supposed to use. By testing I mean automated end-to-end testing or manual testing, not unit testing.

Currently under development.

## Building & running

 - clone this repo
 - run `npm install`
 - start the server using `node server.js`
 - you can run the unittests using `npm test`

## Configuration

The application can be configured using *environment variables* before executing `node server.js` . The default configuration matches the relative URIs of the google OAuth2 implementation.

List of environment variables:

|Variable name|Default value|Description|
|--------------|------------|----------|
|`PORT`|8282|The port the server listens on|
|`EXPECTED_CLIENT_ID`|`dummy-client-id`|The [client identifier](https://tools.ietf.org/html/rfc6749#section-2.2) which your SUT should send to the OAuth2 server in authentication requests and access token requests.|
|`EXPECTED_CLIENT_SECRET`|`dummy-client-secret`|The [client secret](https://tools.ietf.org/html/rfc6749#section-2.3.1) which your SUT should send to the OAuth2 server in access token requests.|
|`AUTH_REQUEST_PATH`|`/o/oauth2/v2/auth`|The HTTP path of the OAuth2 [authorization endpoint](https://tools.ietf.org/html/rfc6749#section-3.1) which the fake server listens on|
|`ACCESS_TOKEN_REQUEST_PATH`|`/oauth2/v4/token`|The HTTP path of the [access token request](https://tools.ietf.org/html/rfc6749#section-4.1.3) which the fake server listens on|
|`PERMITTED_REDIRECT_URLS`|`http://localhost:8181/auth/login`|comma-separated list of permitted [redirection endpoints](https://tools.ietf.org/html/rfc6749#section-3.1.2)|

All those environment variables are defined in `.env` file with some examples. To use them, set them with your environment values and run `$node server.js` or `$npm start`. Those variables are then magically put in the process environment variables using [dotenv](https://www.npmjs.com/package/dotenv).
