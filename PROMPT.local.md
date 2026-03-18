
# Steps
- New typescript project
  - development with tsx
  - build with tsc
  - compile to ES module
- Add build command to output js to dist folder
- Add dist folder to package to release
- Add simple express server which return basic mock ES health endpoint
- Main code in src folder
- Test code in test folder, unit test will be vitest
- Test will focus on integration test which will use official ES client targeting the local host
- Default port is 19200
- Commander is used for CLI, 
- Main command is serve (example elastic-mock serve --port 19200)
- src/index.ts will be main entrypoint for development (dist/index.js is main entrypoint for final package)