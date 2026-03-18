# Test 1: Cluster Baseline

Verify that the `elastic-mock` server is running and responding to cluster-level health checks.

## Steps

### 1.1 Cluster Health

Check if the cluster is reachable and returns a valid health status.

**Request:**

```http
GET /_cluster/health
```

**Expected Response:**

- HTTP Status: `200 OK`
- JSON Body:
  ```json
  {
    "cluster_name": "elastic-mock",
    "status": "green"
  }
  ```

### 1.2 Cluster State

Verify that the cluster state is accessible and indicates no indices exist (initial state).

**Request:**

```http
GET /_cluster/state/metadata
```

**Expected Response:**

- HTTP Status: `200 OK`
- JSON Body should contain an empty or default `indices` object.
