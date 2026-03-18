# Test 5: Cleanup and Teardown

Test index deletion and ensure the cluster returns to a clean state.

## Steps

### 5.1 Delete Index

Remove the `products` index.

**Request:**

```http
DELETE /products
```

**Expected Response:**

- HTTP Status: `200 OK`
- JSON Body should contain `acknowledged: true`.

### 5.2 Verify Index Deletion (Existence)

Ensure the index no longer exists.

**Request:**

```http
HEAD /products
```

**Expected Response:**

- HTTP Status: `404 Not Found`

### 5.3 Verify Index Deletion (CAT)

The `_cat/indices` list should now be empty (or at least not contain `products`).

**Request:**

```http
GET /_cat/indices
```

**Expected Response:**

- HTTP Status: `200 OK`
- Response body should be empty (if no other indices exist).

### 5.4 Final Health Check

Perform a final cluster health check to ensure everything is stable after operations.

**Request:**

```http
GET /_cluster/health
```

**Expected Response:**

- HTTP Status: `200 OK`
- JSON Body: `status: "green"`
  (Status remains green as unassigned shards for deleted indices are removed).
