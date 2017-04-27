"use strict";

const express = require("express");
const fs = require("fs");
const _ = require("underscore");
const session = require("express-session");
const randomstring = require("randomstring");


const ui = _.template(`
<html>
<head>
    
    <title>Fake Google OAuth2 (and maybe other services)</title>
</head>
<body>
    <h1>Fake Google OAuth2 (and maybe other services)</h1>
    <h2>Request parameters:</h2>
    <table>
        <tr>
            <td>redirect_uri:</td>
            <td><%- query.redirect_uri  %></td>
        </tr>
        <tr>
            <td>client_id:</td>
            <td><%- query.client_id  %></td>
        </tr>
        <tr>
            <td>response_type:</td>
            <td><%- query.response_type  %></td>
        </tr>
    </table>
    <h2>Log in as...</h2>
    <form action="/login-as">
        <input type="email" placeholder="you@patientsknowbest.com" name="email" />
        <input type="submit" value="generate token"
    </form>
</body>
<html>
`);

// App
const app = express();
const code2token = {};

const EXPECTED_CLIENT_ID = "dummy-client-id";
const EXPECTED_CLIENT_SECRET = "dummy-client-secret";

function errorMsg(descr, expected, actual) {
  return "expected " + descr + ": " + expected + ", actual: " + actual;
}

function validateClientId(actualClientId, res) {
  if (actualClientId === EXPECTED_CLIENT_ID) {
    return true;
  }
  res.writeHead(400, {
    "X-Debug": errorMsg("client_id", EXPECTED_CLIENT_ID, actualClientId)
  });
  res.end();
  return false;
}

function validateAuthRequest(req, res) {
  const actualClientId = req.query.client_id;
  return validateClientId(actualClientId, res);
}

function validateAuthorizationHeader(header, res) {
  header = header.trim();
  if (!header.startsWith("Basic ")) {
    return false;
  }
  header = header.substring("Basic ".length).trim();
  const decoded = new Buffer(header, "base64").toString("ascii");
  if (decoded === "") {
    return false;
  }
  const segments = decoded.split(":");
  if (segments.length != 2) {
    return false;
  }
  if (segments[0] !== EXPECTED_CLIENT_ID) {
    return false;
  }
  if (segments[1] !== EXPECTED_CLIENT_SECRET) {
    return false;
  }
  return true;
}

function validateAccessTokenRequest(req, res) {
  let success = true, msg;
  if (req.query.grant_type !== "authorization_code") {
    success = false;
    msg = errorMsg("grant_type", "authorization_code", req.query.grant_type);
  }
  if (!validateClientId(req.query.client_id, res)) {
    success = false;
  }
  if (!validateAuthorizationHeader(req.headers["authorization"])) {
    success = false;
    msg = errorMsg("Authorization header", req.headers["authorization"], "Basic ZHVtbXktY2xpZW50LWlkOmR1bW15LWNsaWVudC1zZWNyZXQ=");
  }
  if (!success) {
    const params = {};
    if (msg) {
      params["X-Debug"] = msg;
    }
    res.writeHead(401, params);
    res.end();
  }
  return success;
}

function createToken() {
  const code = "C-" + randomstring.generate(3);
  const accesstoken = "ACCT-" + randomstring.generate(6);
  const refreshtoken = "REFT-" + randomstring.generate(6);
  code2token[code] = {
    access_token: accesstoken,
    expires_in: 3600,
    refresh_token: refreshtoken
  };
  return code;
}

app.use(session({
  secret: "keyboard cat",
  resave: false,
  saveUninitialized: true,
  cookie: {secure: false}
}))

app.get("/o/oauth2/v2/auth", (req, res) => {
  if (validateAuthRequest(req, res)) {
    req.session.redirect_uri = req.query.redirect_uri;
    if (req.query.state) {
      req.session.client_state = req.query.state;
    }
    res.send(ui({
      query: req.query
    }));
  }
});

app.get("/login-as", (req, res) => {
  const code = createToken();
  var location = req.session.redirect_uri + "?code=" + code;
  if (req.session.state) {
    location += "&state=" + req.session.state;
  }
  res.writeHead(307, {"Location": location});
  res.end();
});

app.get("/oauth2/v4/token", (req, res) => {
  if (validateAccessTokenRequest(req, res)) {
    const code = req.query.code;
    const token = code2token[code];
    if (token !== undefined) {
      res.send(token);
    }
    res.end();
  }
});

app.get("/oauth2/v3/tokeninfo", (req, res) => {

});


module.exports = {
  app: app,
  validateClientId: validateClientId,
  validateAccessTokenRequest: validateAccessTokenRequest,
  validateAuthorizationHeader: validateAuthorizationHeader,
  EXPECTED_CLIENT_ID: EXPECTED_CLIENT_ID,
  EXPECTED_CLIENT_SECRET: EXPECTED_CLIENT_SECRET
};
