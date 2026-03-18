# Indices APIs Specification

The Indices API allows you to manage indices, including their creation, deletion, configuration, and maintenance.

## Core Endpoints

| Action              | Method   | Endpoint                    | Description                               |
| :------------------ | :------- | :-------------------------- | :---------------------------------------- |
| **Create Index**    | `PUT`    | `/{index}`                  | Creates a new index.                      |
| **Delete Index**    | `DELETE` | `/{index}`                  | Deletes an existing index.                |
| **Get Index**       | `GET`    | `/{index}`                  | Returns information about an index.       |
| **Index Exists**    | `HEAD`   | `/{index}`                  | Checks if an index or alias exists.       |
| **Close/Open**      | `POST`   | `/{index}/_close` / `_open` | Closes or re-opens an index.              |
| **Mappings**        | `GET`    | `/{index}/_mapping`         | Returns the field mappings for an index.  |
| **Update Mappings** | `PUT`    | `/{index}/_mapping`         | Adds new fields to an existing index.     |
| **Settings**        | `GET`    | `/{index}/_settings`        | Returns settings for one or more indices. |
| **Aliases**         | `POST`   | `/_aliases`                 | Updates index aliases.                    |

## Detailed API Specifications

### Create Index API (`PUT /{index}`)

Creates a new index with optional settings and mappings.

**Example Request:**

```json
PUT /my-index
{
  "settings": {
    "index": {
      "number_of_shards": 3,
      "number_of_replicas": 2
    }
  },
  "mappings": {
    "properties": {
      "field1": { "type": "text" },
      "field2": { "type": "keyword" }
    }
  },
  "aliases": {
    "my-alias": {}
  }
}
```

### Put Mapping API (`PUT /{index}/_mapping`)

Adds new fields to an index or updates mapping settings for existing fields.

**Example Request:**

```json
PUT /my-index/_mapping
{
  "properties": {
    "new_field": { "type": "keyword" }
  }
}
```

### Update Aliases API (`POST /_aliases`)

Atomically updates index aliases.

**Example Request:**

```json
POST /_aliases
{
  "actions": [
    { "add": { "index": "my-index", "alias": "alias1" } },
    { "remove": { "index": "old-index", "alias": "alias1" } }
  ]
}
```

---

_Source: Based on Elasticsearch 8.x Official Documentation._
