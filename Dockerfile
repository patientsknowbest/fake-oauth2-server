FROM node
MAINTAINER bence@patientsknowbest.com
RUN mkdir /opt/fake-oauth2-server
WORKDIR /opt/fake-oauth2-server
ADD server.js server.js
ADD input.html input.html
ADD app.js app.js
ADD node_modules node_modules
EXPOSE 8282
ENTRYPOINT ["node" , "/opt/fake-oauth2-server/server.js" ]
