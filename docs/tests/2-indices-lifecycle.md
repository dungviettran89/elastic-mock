# Test 2: Indices Lifecycle

Test index creation, verification of existence, and retrieval of mappings.

## Steps

### 2.1 Create Index

Create a new index named `products` with specific mappings.

**Request:**

```http
PUT /products
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0
  },
  "mappings": {
    "properties": {
      "name": { "type": "text" },
      "price": { "type": "double" },
      "sku": { "type": "keyword" }
    }
  }
}
```

**Expected Response:**

- HTTP Status: `200 OK`
- JSON Body:
  ```json
  {
    "acknowledged": true,
    "shards_acknowledged": true,
    "index": "products"
  }
  ```

### 2.2 Index Existence

Verify that the `products` index exists.

**Request:**

```http
HEAD /products
```

**Expected Response:**

- HTTP Status: `200 OK`

### 2.3 Get Mapping

Retrieve the mappings for the `products` index and verify they match the creation request.

**Request:**

```http
GET /products/_mapping
```

**Expected Response:**

- HTTP Status: `200 OK`
- JSON Body:
  ```json
  {
    "products": {
      "mappings": {
        "properties": {
          "name": { "type": "text" },
          "price": { "type": "double" },
          "sku": { "type": "keyword" }
        }
      }
    }
  }
  ```
