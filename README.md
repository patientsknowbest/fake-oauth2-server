# Fake OAuth2

This project is an OAuth2 server implementation for testing purposes. See [RFC 6749](https://tools.ietf.org/html/rfc6749) .  

It is useful for you if you are developing an OAuth2 client application and want to stub the server for testing purposes.
In this context the subject under testing is your client application and this project can act as a stub of the external OAuth service,
which your application is supposed to use. By testing I mean automated end-to-end testing or manual testing, not unit testing.

Currently under development.

## Building & running

 - clone this repo
 - run `npm install`
 - start the server using `node server.js`
 - you can run the unittests using `npm test`
 
## Configuration

The application can be configured using *environment variables* before executing `node server.js` .

List of environment variables:

|Variable name|Default value|Description|
|--------------|------------|----------|
