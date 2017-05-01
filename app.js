"use strict";

const express = require("express");
const fs = require("fs");
const _ = require("underscore");
const session = require("express-session");
const randomstring = require("randomstring");

const ui = _.template(fs.readFileSync("./input.html").toString());

// App
const app = express();

const EXPECTED_CLIENT_ID = process.env.EXPECTED_CLIENT_ID || "dummy-client-id";
const EXPECTED_CLIENT_SECRET = process.env.EXPECTED_CLIENT_SECRET || "dummy-client-secret";
const AUTH_REQUEST_PATH = process.env.AUTH_REQUEST_PATH || "/o/oauth2/v2/auth";
const ACCESS_TOKEN_REQUEST_PATH = process.env.ACCESS_TOKEN_REQUEST_PATH || "/oauth2/v4/token";
const TOKENINFO_REQUEST_URL = process.env.TOKENINFO_REQUEST_URL || "/oauth2/v3/tokeninfo/:id_token";
const PERMITTED_REDIRECT_URLS = process.env.PERMITTED_REDIRECT_URLS ? process.env.PERMITTED_REDIRECT_URLS.split(",") : ["http://localhost:8181/auth/login"];

const code2token = {};
const id_token2persondata = {};


function now() {
  return Math.round(new Date().valueOf() / 1000);
}

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
  if (validateClientId(actualClientId, res)) {
    if (req.query.response_type !== "code") {
      res.writeHead(401, {
        "X-Debug": errorMsg("response_type", "code", req.query.response_type)
      });
      return false;
    }
    if (req.query.redirect_uri && ! _.contains(PERMITTED_REDIRECT_URLS, req.query.redirect_uri)) {
      return false;
    }
    return true;
  }
  return false;
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

function createToken(name, email, expires_in) {
  const code = "C-" + randomstring.generate(3);
  const accesstoken = "ACCT-" + randomstring.generate(6);
  const refreshtoken = "REFT-" + randomstring.generate(6);
  const id_token = "IDT-" + randomstring.generate(6);
  const token = {
    access_token: accesstoken,
    expires_in: expires_in,
    refresh_token: refreshtoken,
    id_token: id_token
  };
  id_token2persondata[id_token] = {
    email: req.query.email,
    email_verified: true,
    name: name
  }
  code2token[code] = token;
  return token;
}

app.use(session({
  secret: "keyboard cat",
  resave: false,
  saveUninitialized: true,
  cookie: {secure: false}
}))

app.get(AUTH_REQUEST_PATH, (req, res) => {
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
  const token = createToken(req.name, req.query.email, req.query.expires_in);
  const code = token.code;
  var location = req.session.redirect_uri + "?code=" + code;
  if (req.session.state) {
    location += "&state=" + req.session.state;
  }
  res.writeHead(307, {"Location": location});
  res.end();
});

app.get(ACCESS_TOKEN_REQUEST_PATH, (req, res) => {
  if (validateAccessTokenRequest(req, res)) {
    const code = req.query.code;
    const token = code2token[code];
    if (token !== undefined) {
      res.send(token);
    }
    res.end();
  }
});

app.get(TOKENINFO_REQUEST_URL, (req, res) => {
  const id_token = req.query.id_token;
  res.send({
      "email": "bence@patientsknowbest.com",
      "email_verified": "true",
      "name": "Bence Eros",
      "given_name": "Bence",
      "family_name": "Eros",
  });
  res.end();
});


module.exports = {
  app: app,
  validateClientId: validateClientId,
  validateAccessTokenRequest: validateAccessTokenRequest,
  validateAuthorizationHeader: validateAuthorizationHeader,
  validateAuthRequest: validateAuthRequest,
  EXPECTED_CLIENT_ID: EXPECTED_CLIENT_ID,
  EXPECTED_CLIENT_SECRET: EXPECTED_CLIENT_SECRET
};
