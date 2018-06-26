/**
 * Created by erosb on 2017.04.26..
 */

const PORT = process.env.PORT || 8282

const app = require('./app')

const server = app.app.listen(PORT)

console.log('Running on http://localhost:' + PORT)
console.log('\texpected Client ID: ' + app.EXPECTED_CLIENT_ID)
console.log('\texpected Client Secret: ' + app.EXPECTED_CLIENT_SECRET)
console.log('\tauthorization endpoint: ' + app.AUTH_REQUEST_PATH)
console.log('\taccess token endpoint: ' + app.ACCESS_TOKEN_REQUEST_PATH)
console.log('\tredirect URLs: ' + app.permittedRedirectURLs())
console.log('\tscopes: ' + app.SCOPES.join(','))

const extra = app.SCOPES.length > 0 ? `&scope=${app.SCOPES[0]}` : ''

const instruction = `http://localhost:${PORT}${
  app.AUTH_REQUEST_PATH
}?redirect_uri=${app.PERMITTED_REDIRECT_URLS[0]}&client_id=${
  app.EXPECTED_CLIENT_ID
}&response_type=code${extra}`

console.log('Start here:', instruction)
console.log('Ensure something is running at:', app.PERMITTED_REDIRECT_URLS[0])

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0)
  })
})
