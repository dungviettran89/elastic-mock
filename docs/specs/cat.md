# CAT APIs Specification

The Compact and Aligned Text (CAT) APIs are designed for human consumption, providing a tabular, plain-text alternative to standard JSON responses.

## Core Endpoints

| Endpoint           | Method | Description                                                      |
| :----------------- | :----- | :--------------------------------------------------------------- |
| `/_cat/health`     | `GET`  | Quick overview of cluster health.                                |
| `/_cat/nodes`      | `GET`  | Information about nodes (roles, load, RAM, etc.).                |
| `/_cat/indices`    | `GET`  | Statistics for all or specific indices (doc count, size).        |
| `/_cat/shards`     | `GET`  | Detailed shard allocation information.                           |
| `/_cat/aliases`    | `GET`  | List of index aliases.                                           |
| `/_cat/allocation` | `GET`  | Disk space and shard allocation per node.                        |
| `/_cat/count`      | `GET`  | Quick document count for the entire cluster or specific indices. |

## Universal Parameters

All `_cat` endpoints support the following query parameters:

| Parameter | Description                                     | Example                                |
| :-------- | :---------------------------------------------- | :------------------------------------- |
| `v`       | Verbose; includes column headings.              | `GET /_cat/indices?v`                  |
| `help`    | Lists all available columns for the endpoint.   | `GET /_cat/nodes?help`                 |
| `h`       | Limits output to specific columns.              | `GET /_cat/indices?h=index,docs.count` |
| `s`       | Sorts output by specified columns.              | `GET /_cat/indices?s=docs.count:desc`  |
| `format`  | Changes output format (`json`, `yaml`, `text`). | `GET /_cat/health?format=json`         |

---

_Source: Based on Elasticsearch 8.x Official Documentation._
