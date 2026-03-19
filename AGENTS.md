## Agent

- You will reply in a short and precise manner
- You will make minimal code change only when necessary
- **CRITICAL**: You MUST always run `npm run build` and `npm run test` (unit/integration tests) after EACH code change to ensure technical integrity and prevent regressions. Do not commit or proceed without verification.

## Project Information

- Mock Elasticsearch using flexsearch backend

## Design

- **Server**: Express.js.
  - **Routers**: Grouped by domain in `src/routes/` folder (e.g., `src/routes/document/`, `src/routes/cat/`). Individual route files should be kept under 200 lines to ensure maintainability.
- **Storage**: In-memory `Store` (Metadata & Docs).
- **Search**: FlexSearch for full-text indexing.
- **Query DSL**: Manual mapper for ES Query DSL.
- **Aggregations**: Manual JS-based processing.

## Documentation

- **Specs**: API definitions in `docs/specs/`.
- **Plans**:
  - `docs/plans/todo/`: Upcoming tasks and fixes.
  - `docs/plans/done/`: Completed implementation phases.
  - _Note_: When a task is finished, move its plan file from `todo/` to `done/`.

## External Tests

- **Suite**: [elasticsearch-clients-tests](https://github.com/elastic/elasticsearch-clients-tests)
- **Runner**: `scripts/external-test-runner.ts` (custom YAML-based runner, run with `npx tsx`).
- **Execution**: `npm run test:external`.
- **Report**: Generated at `external-tests/test-report.json` after execution.

## Server Management

- **Start (Production)**: `npm run service:start` (builds and starts via PM2 on port 19200)
- **Start (Development)**: `npm run dev` (starts via tsx in foreground on port 19200)
- **Stop Service**: `npm run service:stop`
- **Service Logs**: `npm run service:log`
- **Service Status**: `npm run service:status`

## Commit Checklist

Before committing any changes, ensure the following steps are completed:

1.  **Format**: Run `npm run format` to ensure code style consistency.
2.  **Build**: Run `npm run build` to verify the project compiles correctly.
3.  **Test**: Run `npm run test`, `npm run test:integration`, and `npm run test:external` to ensure all tests pass.
