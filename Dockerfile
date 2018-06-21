FROM node:10.5-alpine

MAINTAINER bence@patientsknowbest.com

WORKDIR /opt/fake-oauth2-server

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm ci

COPY src src

EXPOSE 8282

ENTRYPOINT ["npm" , "start" ]
