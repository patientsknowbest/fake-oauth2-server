module.exports = {
  extends: ['standard', 'prettier', 'prettier/standard'],
  plugins: ['prettier', 'standard', 'jasmine'],
  parserOptions: {
    sourceType: 'module'
  },
  env: {
    es6: true,
    node: true
  },
  rules: {
    'prettier/prettier': ['error', { singleQuote: true, semi: false }]
  }
}
