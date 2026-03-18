# Test 3: Document CRUD

Test the full lifecycle of a single document in the `products` index.

## Steps

### 3.1 Create Document (PUT)

Add a document with a specific ID.

**Request:**

```http
PUT /products/_doc/1
{
  "name": "Widget A",
  "price": 10.99,
  "sku": "W-A-001"
}
```

**Expected Response:**

- HTTP Status: `201 Created`
- JSON Body should contain `_id: "1"`, `result: "created"`.

### 3.2 Get Document

Retrieve the document by ID.

**Request:**

```http
GET /products/_doc/1
```

**Expected Response:**

- HTTP Status: `200 OK`
- JSON Body:
  ```json
  {
    "_index": "products",
    "_id": "1",
    "found": true,
    "_source": {
      "name": "Widget A",
      "price": 10.99,
      "sku": "W-A-001"
    }
  }
  ```

### 3.3 Update Document

Partially update the price of the document.

**Request:**

```http
POST /products/_update/1
{
  "doc": {
    "price": 12.50
  }
}
```

**Expected Response:**

- HTTP Status: `200 OK`
- JSON Body should contain `result: "updated"`.

### 3.4 Delete Document

Remove the document.

**Request:**

```http
DELETE /products/_doc/1
```

**Expected Response:**

- HTTP Status: `200 OK`
- JSON Body should contain `result: "deleted"`, `found: true`.

### 3.5 Get Deleted Document

Verify the document is gone.

**Request:**

```http
GET /products/_doc/1
```

**Expected Response:**

- HTTP Status: `404 Not Found`
- JSON Body should contain `found: false`.
