## Agent

- You will reply in a short and precise manner
- You will make minimal code change only when necessary

## Project Information

- Mock Elasticsearch using flexsearch backend

## Design

- **Server**: Express.js.
- **Storage**: In-memory `Store` (Metadata & Docs).
- **Search**: FlexSearch for full-text indexing.
- **Query DSL**: Manual mapper for ES Query DSL.
- **Aggregations**: Manual JS-based processing.

## Commit Checklist

Before committing any changes, ensure the following steps are completed:

1.  **Format**: Run `npm run format` to ensure code style consistency.
2.  **Build**: Run `npm run build` to verify the project compiles correctly.
3.  **Test**: Run `npm run test` and `npm run test:integration` to ensure all tests pass.
