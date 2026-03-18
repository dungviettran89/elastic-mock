# Cluster APIs Specification

The Elasticsearch Cluster APIs allow you to manage and monitor your infrastructure at the cluster, node, and shard levels.

## Common Endpoints

| Endpoint                       | Method         | Description                                                                     |
| :----------------------------- | :------------- | :------------------------------------------------------------------------------ |
| `/_cluster/health`             | `GET`          | Returns the health status (green, yellow, red) of the cluster.                  |
| `/_cluster/state`              | `GET`          | Returns the comprehensive state of the cluster (metadata, routing table, etc.). |
| `/_cluster/stats`              | `GET`          | Returns statistical information about the cluster (disk usage, memory, etc.).   |
| `/_cluster/settings`           | `GET` / `PUT`  | Retrieves or updates dynamic cluster settings (persistent or transient).        |
| `/_cluster/allocation/explain` | `GET` / `POST` | Provides an explanation for why a shard is or isn't allocated.                  |
| `/_cluster/pending_tasks`      | `GET`          | Lists cluster-level changes that have not yet been executed.                    |
| `/_cluster/reroute`            | `POST`         | Manually changes the allocation of individual shards.                           |

## Detailed API Specifications

### Cluster Health (`GET /_cluster/health`)

Returns a simple status on the health of the cluster.

**Query Parameters:**

- `level`: (Optional, string) Can be `cluster`, `indices`, or `shards`. Defaults to `cluster`.
- `wait_for_status`: (Optional, string) Wait until the cluster health is at least the specified status (`green`, `yellow`, or `red`).
- `timeout`: (Optional, time units) How long to wait for the status before returning.
- `local`: (Optional, boolean) If `true`, the request retrieves information from the local node only. Defaults to `false`.

**Response Fields:**

- `cluster_name`: Name of the cluster.
- `status`: Health status (`green`, `yellow`, `red`).
- `timed_out`: `true` if the request timed out.
- `number_of_nodes`: Total number of nodes in the cluster.
- `number_of_data_nodes`: Number of nodes that are dedicated data nodes.
- `active_primary_shards`: Number of active primary shards.
- `active_shards`: Total number of active primary and replica shards.
- `relocating_shards`: Number of shards that are currently moving.
- `initializing_shards`: Number of shards that are being freshly created.
- `unassigned_shards`: Number of shards that are not allocated to any node.

### Cluster Settings (`GET | PUT /_cluster/settings`)

Retrieves or updates dynamic cluster settings.

**Setting Types:**

- **Persistent:** Survive a full cluster restart.
- **Transient:** Reset after a cluster restart.
- **Precedence:** Transient > Persistent > `elasticsearch.yml` > Default.

_Note: In 8.x, it is recommended to use persistent settings over transient ones._

**Example Update Request:**

```json
PUT /_cluster/settings
{
  "persistent": {
    "indices.recovery.max_bytes_per_sec": "50mb"
  },
  "transient": {
    "cluster.routing.allocation.enable": "all"
  }
}
```

### Cluster State (`GET /_cluster/state`)

Returns metadata about the cluster state.

**Path Parameters:**

- `metrics`: (Optional, string) Comma-separated list of metrics to include (e.g., `metadata`, `nodes`, `routing_table`).
- `indices`: (Optional, string) Comma-separated list of indices to include in the metadata.

---

_Source: Based on Elasticsearch 8.x Official Documentation._
