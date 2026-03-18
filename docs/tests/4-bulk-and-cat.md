# Test 4: Bulk Operations and CAT APIs

Test high-volume ingestion and verify the cluster state using human-readable CAT APIs.

## Steps

### 4.1 Bulk Load Documents

Use the `_bulk` API to add multiple products at once.

**Request:**

```http
POST /_bulk
{ "index" : { "_index" : "products", "_id" : "1" } }
{ "name": "Widget A", "price": 10.99, "sku": "W-A-001" }
{ "index" : { "_index" : "products", "_id" : "2" } }
{ "name": "Widget B", "price": 15.50, "sku": "W-B-002" }
{ "index" : { "_index" : "products", "_id" : "3" } }
{ "name": "Widget C", "price": 20.00, "sku": "W-C-003" }
```

**Expected Response:**

- HTTP Status: `200 OK`
- JSON Body: `errors: false` and a list of results for each item.

### 4.2 CAT Indices

Verify the `products` index appears in the indices list with the correct document count.

**Request:**

```http
GET /_cat/indices?v&h=index,docs.count
```

**Expected Response:**

- HTTP Status: `200 OK`
- Table Body should contain: `products 3`.

### 4.3 CAT Count

Get a quick document count for the `products` index.

**Request:**

```http
GET /_cat/count/products?v
```

**Expected Response:**

- HTTP Status: `200 OK`
- Table Body should contain the number `3`.

### 4.4 CAT Health

Check the cluster health in tabular format.

**Request:**

```http
GET /_cat/health?v
```

**Expected Response:**

- HTTP Status: `200 OK`
- Table Body should show cluster health (e.g., `green` or `yellow`).
