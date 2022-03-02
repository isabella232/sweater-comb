# JSON API: The Good Parts

## What is JSON API?

[JSON API](https://jsonapi.org/) is a standard for representing resources as JSON data.

Generally, our API adheres closely to the [JSON API specification](https://jsonapi.org/format/), with some caveats noted in the following section ["The Rough Parts"](#the-rough-parts).

## Why build on JSON API?

We found JSON API to be an excellent starting point for a resource-based API, formatting and structuring JSON data in requests and responses. Leveraging JSON API's opinionated choices enabled us to focus more on designing and building the actual content of our API.

## Our JSON API implementation, by example

What does JSON API look like? What do I need to know to get started building a resource in 5 minutes? Let's cover the basics first; you can always refer to the JSON API specification for a deeper understanding of specific details.

### Responses and the top-level object

Generally, most of our JSON API responses look something like this. While the spec makes some of these optional, these fields are generally required in our API's top-level object responses.

```json
HTTP 200 OK
Content-Type: application/vnd.api+json

{
    "data": <resource or array of resources>,
    "jsonapi": {"version": "1.0"},
    "links": {
        "self": <path to this resource you just requested>
    }
}
```

Some optional JSON API fields may be specified in addition to these, but this is the minimum basic structure that our responses must provide.

### Server-assigned identity

Our resources generally get server-assigned IDs when they are created. Same structure, but the response status code when an ID is assigned is `HTTP 201 Created`.

### Data

Resource data objects have a certain structure as well.

```json
{
    "id": <unique uuid of this resource>,
    "type": <resource type, from an enumerated list of our supported types>,
    "attributes": {
        <actual resource content here>
    }
}
```

Collections are just arrays of these structured resource data objects.

```json
[ {"id": <id>, "type": <type>, "attributes": {...}}, ... ]
```

### Links

JSON API Links are like hyperlinks with context. They can be simple URL strings:

```json
links: {
    "self": "/path/to/this/resource"
}
```

They can also provide metadata with a bit more structure. Either form is valid:

```json
links: {
    "self": {
        "href": "/path/to/this/resource",
        "meta": {
            <free form key-value stuff about this link>
        }
    }
}
```

All top-level responses require a self-link.

Links must be absolute paths. They may indicate a host if the hostname is known / knowable at response creation time. The protocol, host and/or path prefix may need to be rewritten by an API gateway in order for links to resolve correctly across multiple backend services.

### Relationships and Links

Data objects may declare relationships to other resources — "links with structured context".

```json
{
    "id": <id>,
    "type": <type>,
    "attributes": {...},
    "relationships": {
        "relation-name": {
            "links": {
                "related": "/path/to/<related resource>/<related-id>?version=<resolved version>&..."
            },
            "data": {"id": <related id>, "type": <related type>} 
        },
        ...
    }
}
```

`relationships` is a mapping of "relation name" ⇒ "relation object". That relation object must conform to the structure shown above; it should provide `links.related`, and must provide `data.id` and `data.type`.

Relationships must not provide the actual content of the related resource — it may only link to related resources. Links must also declare a [version]() in the URL to the related resource. This should be the *resolved-version* of the requested resource (not the requested version).

### Pagination and Links

Pagination is defined by Links in JSON API as well, which require all of these fields:

```json
links: {
    "first": "/path/to/first/page",
    "last": "/path/to/last/page",
    "prev": "/path/to/previous/page",
    "next": "/path/to/next/page"
}
```

If some links are unavailable (no previous page at the first page, no next at the last page, etc.) then the value is `null`. Some links such as `last` may be `null` when providing them would be prohibitively resource-intensive. These links contain [pagination parameters, as defined below](#pagination-parameters).

## Errors

Errors have a certain minimum required structure as well.

```json
HTTP 400 Bad Request
Content-Type: application/vnd.api+json

{
  "jsonapi": {"version": "1.0"},
	"errors": [{
		"id": <unique id for the error itself>,
		"status": <HTTP status code, as a string>,
		"detail": <detailed message explaining what went wrong> 
	},...]
}

```

The error ID should uniquely identify this occurance of the problem. A server-generated trace or request ID may be used for this ID, so long that the ID is unique. If there are multiple errors in the response, each must have a unique ID.

[A Request ID header is also required in our standard responses](standards.md#response-headers), which should be considered authoritative for correlation purposes.

### Request paths

- Paths should be as flat as possible.
    - For tenant-by-organization reasons, Snyk's API paths are prefixed with `/orgs/{org_id}`.
    - Paths must support the `/orgs/{org_id}` prefix.
    - Paths should support the `/groups/{group_id}` prefix.
- Standard paths for a resource collection of "things". Resources are located under a base path that is a collection, followed by an identifier to address an individual resource. Because that base path is a collection, use the plural form ("things" not "thing").
    - `POST /things` to create a new thing
    - `GET /things` to list them (with optional query filters and pagination)
    - `GET /things/:id` to get a single one
    - `PATCH /things/:id` to modify one
    - `DELETE /things/:id` to remove one

### Resource Aggregation

#### Singleton

The resource at .../resource is a single object, rather than a collection.

.../resource/{id} paths are not allowed.

Singletons do not have an ID specified. This breaks slightly with JSON API, intended.

#### Collection

These are "normal" resources that may be individually addressed at .../resource/{id} or as a collection at .../resource. 

#### Bulk

Bulk resources cannot be individually addressed by path. .../resource/{id} paths are not allowed.

POST creates many, and may respond 204 (no content). POST `.data` must be an array.

GET, PATCH, and DELETE all operate on collections.

Self links are links to the bulk GET.

### Query parameters and JSON API

JSON API is highly prescriptive with query parameters, though they are only SHOULD suggestions, not MUST requirements. In particular, it suggests:

- Putting all filtering criteria into a single `filter` query parameter
- Putting all pagination criteria into a single `page` query parameter
- Using `fields` for all sparse fieldsets
- Using square-brackets to sub-divide these parameters, like a namespace.
    - `page[offset]=5` or `filter[project]=phoenix` for example.

It's an interesting idea, but we found it took away from usability and clarity in our API. Square brackets are escaped, making URLs harder for humans to read and modify. Such parameters are also not supported by OpenAPI.

As an alternative we decided to standardize on our own domain-specific query parameters for consistency with respect to our data model across the API.

One reason JSON API states for name-spacing parameters with brackets, is compatibility with future versions of the standard. With our strong versioning scheme, we are confident we will be able to evolve with such changes in standards over time.

### <a id="pagination-parameters"></a>Pagination parameters

Pagination in our API is cursor-based. Cursor-based pagination provides a page of N records before or after a specific record in a data set.

Our API uses these reserved parameters for pagination:

- `starting_after` - Return `limit` records after the record identified by cursor position `starting_after`.
- `ending_before` - Return `limit` records before the record identified by cursor position `ending_before`.
- `limit` - Size of page, in increments of 10, up to 100

Cursor position identifiers are determined by the links given in a paginated response.

## <a id="the-rough-parts"></a>The Rough Parts

Other parts of the JSON API specification we avoided.

### Locating resources through any relationship

JSON API describes how resources may be requested or even modified through their relationships. For example, you might request `resource2/id2` alternatively with `/path/to/resource1/id1/relationships/resource2/id2` if they are related. We don't support or allow this. This is one area where we've intentionally departed from JSON API. We want to provide the links among our resources to form a graph — but leave the actual navigation and traversal of that graph to GraphQL!

Only `related` links are allowed in relationships.

### Compound documents

As discussed above in *relationships*, related objects are linked, but not included in our responses. This also applies to compound documents in JSON API.

Aside from strategic differences — we're building GraphQL on top of simple resources — we found the implementation of compound documents to be a problem for generating code from OpenAPI descriptions that allow them. JSON API compound documents store all related data objects in an `included` array together, mixing types. An array of polymorphic `anyOf:` objects can certainly be expressed in JSON Schema, but in practice, OpenAPI code generators struggle with processing such schema — especially statically-typed compiled languages.
