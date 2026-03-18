#!/usr/bin/env node
import { Command } from 'commander';
import { createServer } from './server.js';

const program = new Command();

program.name('elastic-mock').description('Mock Elasticsearch server').version('1.0.0');

program
  .command('serve')
  .description('Start the mock server')
  .option('-p, --port <number>', 'Port to listen on', '19200')
  .action((options) => {
    const port = parseInt(options.port, 10);
    const app = createServer();

    app.listen(port, () => {
      console.log(`Mock Elasticsearch server listening on port ${port}`);
    });
  });

program.parse();
