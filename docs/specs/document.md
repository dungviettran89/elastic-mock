# Document APIs Specification

The Document APIs provide the primary interface for managing individual documents within an Elasticsearch index.

## Core Endpoints

| Action     | Method         | Endpoint                | Description                                            |
| :--------- | :------------- | :---------------------- | :----------------------------------------------------- |
| **Index**  | `PUT` / `POST` | `/{index}/_doc/{id}`    | Adds or replaces a document.                           |
| **Create** | `PUT` / `POST` | `/{index}/_create/{id}` | Adds a document only if it doesn't already exist.      |
| **Get**    | `GET`          | `/{index}/_doc/{id}`    | Retrieves a document by ID.                            |
| **Delete** | `DELETE`       | `/{index}/_doc/{id}`    | Removes a document by ID.                              |
| **Update** | `POST`         | `/{index}/_update/{id}` | Partially updates a document.                          |
| **Bulk**   | `POST`         | `/_bulk`                | Performs multiple indexing/deletion/update operations. |

## Detailed API Specifications

### Index API (`PUT | POST /{index}/_doc/{id}`)

Adds a JSON document to the specified index.

**Path Parameters:**

- `index`: (Required, string) Name of the index.
- `id`: (Optional, string) Unique identifier for the document. If omitted with `POST`, Elasticsearch generates one.

**Query Parameters:**

- `routing`: (Optional, string) Custom routing value to target a specific shard.
- `refresh`: (Optional, boolean/string) Control when the changes are made visible to search.
- `if_seq_no`: (Optional, integer) Only perform the operation if the document has this sequence number.
- `if_primary_term`: (Optional, integer) Only perform the operation if the document has this primary term.

### Get API (`GET /{index}/_doc/{id}`)

Retrieves the document from the index.

**Query Parameters:**

- `_source`: (Optional, boolean/string) True/False to return `_source`, or a list of fields to include.
- `realtime`: (Optional, boolean) If `true`, the request is real-time. Defaults to `true`.

**Response Fields:**

- `_index`: Name of the index.
- `_id`: Document ID.
- `_version`: Document version.
- `_seq_no`: Sequence number.
- `_primary_term`: Primary term.
- `found`: `true` if document exists.
- `_source`: The document content.

### Update API (`POST /{index}/_update/{id}`)

Updates a document using a partial document or a script.

**Request Body (Partial Document):**

```json
{
  "doc": {
    "name": "new_name"
  }
}
```

**Request Body (Script):**

```json
{
  "script": {
    "source": "ctx._source.counter += params.count",
    "lang": "painless",
    "params": {
      "count": 4
    }
  }
}
```

### Bulk API (`POST /_bulk`)

Performs multiple index, create, delete, and update operations in a single request using **ndjson** format.

**Example Request:**

```text
{ "index" : { "_index" : "test", "_id" : "1" } }
{ "field1" : "value1" }
{ "delete" : { "_index" : "test", "_id" : "2" } }
{ "create" : { "_index" : "test", "_id" : "3" } }
{ "field1" : "value3" }
```

---

_Source: Based on Elasticsearch 8.x Official Documentation._
