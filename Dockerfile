FROM node:10-alpine

MAINTAINER bence@patientsknowbest.com

WORKDIR /opt/fake-oauth2-server

COPY server.js server.js
COPY input.html input.html
COPY app.js app.js
COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm ci

EXPOSE 8282

ENTRYPOINT ["npm" , "start" ]
