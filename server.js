/**
 * Created by erosb on 2017.04.26..
 */
require('dotenv').config();
const PORT = process.env.PORT || 8282;

const app = require("./app");


const server = app.app.listen(PORT);

console.log("Running on http://localhost:" + PORT);
console.log("\texpected Client ID: " + app.EXPECTED_CLIENT_ID);
console.log("\texpected Client Secret: " + app.EXPECTED_CLIENT_SECRET);
console.log("\tauthorization endpoint: " + app.AUTH_REQUEST_PATH);
console.log("\taccess token endpoint: " + app.ACCESS_TOKEN_REQUEST_PATH);
console.log("\tredirect URLs: " + app.permittedRedirectURLs());

process.on("SIGTERM", function() {
  server.close(() => {
    process.exit(0);
  });
});
