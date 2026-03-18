# Search API Specification

The Elasticsearch Search API allows you to execute search queries and retrieve matching documents from your indices.

## Endpoints

| Endpoint                     | Method         | Description                                     |
| :--------------------------- | :------------- | :---------------------------------------------- |
| `/_search`                   | `GET` / `POST` | Search across all indices.                      |
| `/<index>/_search`           | `GET` / `POST` | Search within a specific index.                 |
| `/<index1>,<index2>/_search` | `GET` / `POST` | Search across multiple comma-separated indices. |

## Request Body Parameters

The request body is a JSON object with several top-level properties:

| Parameter          | Type         | Description                                                                                                                                            |
| :----------------- | :----------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `query`            | Object       | The search criteria using [Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html) (e.g., `match`, `term`, `bool`). |
| `from`             | Integer      | Starting offset (default: `0`).                                                                                                                        |
| `size`             | Integer      | Number of hits to return (default: `10`).                                                                                                              |
| `sort`             | Array/String | Specifies how to order results (e.g., `[{"post_date": "desc"}]`).                                                                                      |
| `_source`          | Boolean/Obj  | Controls which fields are returned in the `_source` field.                                                                                             |
| `aggs`             | Object       | Defines [aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html) to summarize data.                    |
| `fields`           | Array        | Returns specific fields (including runtime and alias fields) in a standardized format.                                                                 |
| `runtime_mappings` | Object       | Defines temporary fields calculated at search time.                                                                                                    |
| `knn`              | Object       | **(New in 8.x)** Defines a k-nearest neighbor search for vector embeddings.                                                                            |
| `pit`              | Object       | Uses a Point-in-Time ID to ensure consistent results across multiple requests.                                                                         |

## Common URL Query Parameters

- `q`: Lucene query string (e.g., `q=user.id:kimchy`).
- `routing`: Targets specific shards to optimize performance.
- `preference`: Controls which shard copies (primary or replica) execute the search.
- `track_total_hits`: If `true`, returns the exact count of matching documents.
- `scroll`: (Optional, time units) Keep the search context open for pagination.

## Response Structure

The response contains details about the search results:

- `took`: Time in milliseconds to execute.
- `timed_out`: `true` if the request timed out.
- `_shards`: Status of shards involved (`total`, `successful`, `skipped`, `failed`).
- `hits.total`: Total number of matching documents.
- `hits.max_score`: Highest relevance score found.
- `hits.hits`: Array of document objects, including `_index`, `_id`, `_score`, and `_source` (or `fields`).

### Example Request (Elasticsearch 8.x)

```json
POST /my-index/_search
{
  "runtime_mappings": {
    "day_of_week": {
      "type": "keyword",
      "script": "emit(doc['@timestamp'].value.dayOfWeekEnum.getDisplayName(TextStyle.FULL, Locale.ROOT))"
    }
  },
  "query": {
    "match": { "message": "error" }
  },
  "fields": ["user.id", "day_of_week"],
  "_source": false,
  "sort": [{ "@timestamp": "desc" }]
}
```

---

_Source: Based on Elasticsearch 8.x Official Documentation._
