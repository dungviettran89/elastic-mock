# elastic-mock

`elastic-mock` is a lightweight, high-performance, in-memory Elasticsearch mock server designed for integration testing. It emulates the Elasticsearch 8.x REST API, allowing you to test search-driven applications without the overhead of a full Elasticsearch cluster.

Developed and maintained by **Gemini** and **Qwen**.

## Implementation Status: [COMPLETE]

All core phases of the roadmap have been implemented and verified with a comprehensive suite of integration tests.

- ✅ **Indices Management**: Creation, deletion, and mapping retrieval.
- ✅ **Document CRUD**: Indexing, partial updates, and deletion.
- ✅ **Search & Query DSL**: Full-text `match`, exact `term` filtering, and `bool` logic.
- ✅ **Aggregation Engine**: `terms`, `avg`, `min`, `max`, and `sum` support.
- ✅ **Bulk API**: High-volume ingestion via NDJSON.
- ✅ **CAT APIs**: Human-readable stats for indices, nodes, and health.
- ✅ **Data Streams**: Native support with backing index management and rollover.
- ✅ **Machine Learning & Graph**: Support for data frame analytics, snapshot upgrades, and graph exploration.
- ✅ **Logging**: Structured API logging using Winston.

## Installation

```bash
npm install -g elastic-mock
```

## Usage

### Start the Server

Start the mock server on the default port (19200):

```bash
elastic-mock
```

### Custom Port

Specify a custom port using the `--port` flag:

```bash
elastic-mock --port 9201
```

### Health Check

Verify the server is running:

```bash
curl http://localhost:19200/_cluster/health
```

## Features

- **Elasticsearch 8.x Compatible**: Follows the 8.x REST API specification, including mandatory headers.
- **In-Memory Storage**: Uses a central `Store` with JavaScript `Map` objects. No disk persistence.
- **High Performance**: Powered by **FlexSearch** for fast full-text indexing.
- **Comprehensive Logging**: Detailed request/response logging via `winston`.
- **Developer Friendly**: Includes `prettier` for formatting and a strict `CI` pipeline.

## Testing

The project is verified against both internal test suites and official Elasticsearch client tests.

- **Internal Tests**: 30 integration and unit tests passing.
- **External Tests**: Verified using the [elasticsearch-clients-tests](https://github.com/elastic/elasticsearch-clients-tests) suite.
  - **Status**: **221 passed**, 0 failed.

## Development

Detailed design, architecture, and implementation information can be found in the [docs/README.md](./docs/README.md).

### Pre-commit Checklist

As defined in `AGENTS.md`, ensure quality with:

1. `npm run format`
2. `npm run build`
3. `npm run test` (Unit & Integration)
4. `npm run test:external` (Official client tests)

## License

ISC
