# API Specifications Documentation Structure

This directory contains the Elasticsearch API specifications, organized to support the development of the elastic-mock project.

## Organization: One File Per API Group

To maintain clarity and ease of navigation, each Elasticsearch API group is documented in its own dedicated Markdown file.

### Current API Groups

- `cluster.md`: Cluster-level management and monitoring (e.g., health, state, settings).
- `search.md`: Core search functionality and Query DSL parameters.

### Standard Document Template

Each API group document should follow this general structure:

1. **Introduction**: A brief overview of the API group's purpose.
2. **Endpoints Table**: A summary of available endpoints, methods, and descriptions.
3. **Detailed API Specifications**: In-depth documentation for common or complex endpoints, including:
   - **Path Parameters**: Parameters used in the URL.
   - **Query Parameters**: Optional or required URL query string parameters.
   - **Request Body**: JSON structure for the request.
   - **Response Fields**: Explanation of the returned data.
4. **Examples**: Practical usage examples (e.g., `curl` commands or JSON blocks).
5. **Source Reference**: Citation of the Elasticsearch version used as the baseline.

## Contribution Guidelines

When adding a new API group:

1. Create a new `.md` file named after the API group (e.g., `indices.md`, `documents.md`).
2. Follow the standard template to ensure consistency across the project.
3. Use Elasticsearch 8.x as the primary reference version unless otherwise specified.
