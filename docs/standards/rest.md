# Snyk REST API Standard

In order to provide a consistent [API as a platform](../principles/api_program.md), Snyk APIs have additional requirements, building on [JSON API](../principles/jsonapi.md) and [Versioning](../principles/version.md) standards.

## Organization and group tenants for resources

Resources in the Snyk v3 API are located under an Organization and possibly a Group tenant, specified as a path prefix.

Resources addressed by Organization begin with `/v3/orgs/{org_id}/...`.

Resources addressed by Group begin with `/v3/groups/{group_id}/...`.

## Standard property conventions

Additional resource properties that must be used in resource attributes, where applicable.

### Timestamp properties

Attribute property names with an `_at` suffix must be timestamps. Timestamp properties must be formatted as [ISO-8601 date-time strings](https://json-schema.org/understanding-json-schema/reference/string.html#dates-and-times).

To declare this format on a timestamp attribute property, use:

`type: string, format: date-time`

### Resource lifecycle timestamps

These properties are optional on a resource, but should be used when applicable. These properties must be formatted as timestamps, due to the suffix.

#### `created_at`

When the resource was created (POST).

#### `updated_at`

When the resource was last updated (PATCH).

#### `deleted_at`

When the resource was deleted (DELETE), if the DELETE operation marks the
resource for deletion, or removes part of its content without actually removing
the existence of the resource.

## Naming Conventions

Casing conventions referenced below are defined in [Spectral's casing function documentation](https://meta.stoplight.io/docs/spectral/ZG9jOjExNg-core-functions#casing).

### Resource collections are plural

API paths locate resources and collections of resources. These are always nouns. Collections should use the plural form of the noun. For example:

* `/things` (collection of things)
* `/things/{thing_id}` (a specific thing, located in a collection of them)
* `/orgs/{org_id}/other_things` (a collection located in a specific org, located in a collection of orgs)

### Mixed case and acronyms

When using camel or pascal case, acronyms are treated as any other concatenated word. For example, `OrgId`, not `OrgID`. This avoids ambiguity and information loss that would otherwise interfere with automated processing of the API schema. For example, a camel case name following these acronym rules can be translated into snake case to produce more conventional Python symbol names.

### Parameter names and path components

Resource collection names, parameters and path variables must use **snake case** names.

```json
/some_resource/{resource_id}?foo_param=foo&bar_param=bar
```

Because these variables are represented in URLs, uppercase letters may cause problems on some client platforms; RFCs recommend that URLs are treated as case-sensitive, but it is a "should", not a "must". Dashes might cause problems for some code generators, ruling out kebab case.

### Referenced Entities

Entities referenced in other documents (using `$ref`) must use **pascal case** names.

Entities will be commonly represented as types or classes when generating code. Pascal case names are conventionally used for such symbols in most targeted languages.

### Schema properties

Schema properties use **snake case** names.

### Operation IDs

When naming an operation, think carefully about how it will look and feel in generated code. Operations generally map to method or function names.

Operation IDs should be readable, intuitive and self-descriptive.

Operation IDs must use **camel case** names. Example:

```json
operationId: getFoo
```

#### Prefix the operation ID with the action being performed

- GET becomes `get` for a single resource (by unique ID)
- GET becomes `list` for multiple resources (pagination and filtering)
- POST becomes `create`
- PATCH becomes `update`
- DELETE becomes `delete`

#### Suffix the operation ID with the name of the resource

Use the singular form if the operation operates on a single resource, plural if it operates on a collection operation.

Examples:
- `getFoo` (get one)
- `listFoos` (get many)
- `createThing` (create one)
- `updateOtherThing` (update one)
- `deleteThings` (bulk delete)

#### Suffix the resource with tenancy if needed

If there are operations which allow addressing the resource by multiple tenancies (a containing resource), differentiate these as a "by resource" name suffix.

Example: `getFooByOrg`, `deleteProjectByGroup`, etc.

### Header field names

```json
headers:
    snyk-requested-version: "2021-08-21~beta"
    snyk-resolved-version: "2021-08-12~beta"
```

[Header field names are case insensitive](https://datatracker.ietf.org/doc/html/rfc7230#section-3.2). Snyk v3 API specs must use kebab case for consistency. All non-standard headers that are unique to Snyk must begin with `snyk-` (e.g. `snyk-requested-version`).

## <a id="user-request-parameters"></a>User-defined Request Parameters

### <a id="filters">Filters

Resource attribute property names may be used as a query parameter name on a resource collection to filter paginated results, so long as these requirements are satisfied:

- The filter parameter name must match the corresponding resource attribute property name.
- The filter parameter must not conflict with [reserved parameters](#reserved-request-parameters).

#### Multiple filter values

A filter parameter may support a single value to match, or a set of multiple values. When a filter supports a set of multiple values, these must be expressed using the form `?property_name=value_1,value_2,...,value_n`. To define such a parameter, in its properties:

- Use `schema: {type: array, items: {type: string}}` (the schema and/or item types may be referenced). Whenever possible, the item type should use an `enum` set of allowed values, a `format` or a `pattern` regex to validate it.
- Use `style: form, explode: false` to indicate a comma-separated representation of multiple values. Refer to the [Parameter object](https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#parameter-object) OpenAPI specification for more information.

Changing a parameter's schema from a single value to multiple values is a non-breaking API change. The inverse however (changing from supporting multple values to a single value) is a breaking API change.

## <a id="reserved-request-parameters"></a>Reserved Request Parameters

The following parameters are reserved for specific purposes in our API. These names should be avoided in resource attribute properties so that they are not misinterpreted as filters.

### <a id="version-parameter"></a>Version

The `version` URL query parameter, `?version=version_string` is reserved for selecting the API version when making a request.

### <a id="pagination-parameters"></a>Pagination

`starting_after`, `ending_before`, and `limit` are reserved for cursor pagination on resource collections, as defined in [JSON API Pagination Parameters](../../principles/jsonapi/#pagination-parameters).

### <a id="formats"></a>Formats

Some resource types may be expressed with a media content-type format other than JSON API. Alternative media content-type formats may be requested using either the format query parameter or the Accept header, as further described below:

#### `format` query parameter

This is a URL query parameter of the form `?format=format_name`, where _format_name_ should be a generally-accepted industry term identifying the media content-type. This parameter's schema must be defined as an enum.

For example, if we offered a SARIF representation of a single resource, the format query parameter might be `sarif`, while the `Content-Type` is `application/sarif+json`.

#### `Accept` request header

This is a request header of the form `Accept: content-type`, where _content-type_ is an IANA assigned or proposed content media type.

Continuing with the above example, `Accept: application/sarif+json`.

#### Response

The response to a requested format may be:

__200 OK__: The `Content-Type` response header indicates the requested format. The response body contains content in the requested format.

Public REST API endpoints must provide a JSON API response, unless another response format is explicitly requested.

The complete contents of the resource should be represented in the `attributes` of the JSON API response, in order to provide API consumers with a consistent and reliable developer experience.

In such cases where this is not possible, a JSON API response must still be provided as the default format, containing these required properties:

- JSON API `data` properties: `id` and `type`.
- Relationship links to obtain the resource in other formats, using the `?format=` query parameter.

__400 Bad Request__: The error should indicate an unknown or unsupported format, and may indicate which formats are supported.

__406 Not Acceptable__: The format is supported but this particular resource cannot be represented in the requested format for some application-specific reason. This is not common.

#### Constraints

- Formats are only supported on GET operations of an equivalent JSON API single resource.
- Formats are not allowed on collections because these must be paginated by JSON API links.
  - Creation of large artifacts (regardless of media type) may require async API techniques (coming soon).
- If a resource supports alternative formats:
  - It must support the use of the `?format` query parameter.
  - It may support the `Accept:` header as long as response caching takes the accept header into account. If this is not possible, `Accept:` must be ignored.
  - Format is optional, must not be required, and must default to the JSON API representation of the resource when not provided.
  - Relationship links may be used to advertise supported formats.
- If both the query parameter and accept header are provided, the query parameter must take precedence. This is due to the limitations of some user agents, which may set a default accept header.

## <a id="response-headers"></a>Response Headers

Certain headers are required in all v3 API responses.

- `snyk-request-id` - Relays a provided request UUID, or generates a new one, which is used to correlate the request to logs and downstream requests to other services.
- [Versioning response headers](../principles/version.md#response-headers).

## <a id="status-codes"></a>Status Codes

In addition to the status codes specified in [JSON-API#Responses](https://jsonapi.org/format/#fetching-resources-responses), we have standardized on additional situations across our surface area, specifically, for dealing with error cases.

All status codes must be listed in this section or as a part of the [JSON-API Specification](https://jsonapi.org). As a general guiding principle, we strive to limit the number of status codes we return into large categorically distinct areas to make working with the Snyk API easier for end-users.

### 400 - Bad Request

A bad request status code & error response must be returned when the user provided an syntactically invalid request header, query parameters, path parameters, or request body. For example, if an `Authorization` header was malformed, then we'd return a `400 Bad Request` where as if we were provided an expired credential (e.g. JWT), we'd want to return a `401 Unauthorized`.

### 401 - Unauthorized

An unauthorized status code & error response must be returned when the requester provides an invalid (e.g. a bad signature) or expired credential. For example, if a requester were to provide a credential (e.g. a JSONWebToken) that was not signed by Snyk, we'd return a `401 Unauthorized`.

### 403 - Forbidden

A forbidden status code & error response must be returned if the requester has provided a valid credential but the identity (e.g. user, service account, app) does not have the required permissions to perform the action. For example, if a user attempts to add a user to an organization but does not have the appropriate permissions to do so. A forbidden should only occur on _write_ actions such as a create, update, or delete. If the requester does not have read access they should receive a `404 Not Found`.

### 404 - Not Found

A not found status code & error response must be returned if the requested resource does not exist _or_ if the requester *does not* have access to the underlying resource. For example, if an org named `pineapple` exists but the user `joe` is not a member of the organization, then Joe should receive a `404 Not Found` when requesting any information related to the `pineapple` organization.

### 409 - Conflict

A conflict status code & error response must be returned if a requested _write_ action cannot be performed because it collides with some constraint (e.g. a unique constraint violation). This status code is also useful when processing idempotent requests which currently are not supported as a part of the Snyk API.

### 422 - Unprocessable Entity

The server understands the content type of the request entity (hence a `415 Unsupported Media Type` status code is inappropriate), and the syntax of the request entity is correct (thus a `400 Bad Request` status code is inappropriate) but was unable to process the contained instructions. For example, if a user attempts to create a new user with a duplicate username, the server should return a `422 Unprocessable Entity` error.

### 429 - Too Many Requests

A too many requests status code & error response must be returned if the requester has exceeded their request quota for some given time period.

## API Documentation

The quality of documentation generated from an OpenAPI specification depends quite a bit on content provided in certain fields. [Redoc](https://redoc.ly/docs/redoc/quickstart/intro/)-generated documentation is used below to illustrate the purpose of these fields and why we require them.

### Tags

The operations (GET, POST, etc) declared for resource paths must be organized with [Tags](https://swagger.io/specification/#tag-object). Tags are used to categorize the endpoints that operate on resources.

![Documentation with operation tags](media/docs_demo_tags.png)

Tags organize the operations such as "List Issue Summaries" or "Get a Snyk Code Issue" under a single Resource category "Issues".

### Operation Summary

The [operation](https://swagger.io/specification/#operation-object) `summary` field provides a more useful and informative string that documents what the request method actually does. In the example above, one operation summary shown is "List Issue Summaries". If this is not specified, the `operationId` (getIssuesSummary) would have been displayed instead.

### Formats

`format: uuid` and `format: date-time` are essential for indicating a field is not just a string, but actually a UUID or an RFC3339 date string. This format is relied upon by request and response validation middleware.

Enum types (`{type: string, enum: [...]}`) should be used wherever it is possible to enumerate a closed set of valid values a field might have. This includes the set of resource types in our API.

![Documentation with property formats](media/docs_demo_formats.png)

Enums make for great self-documenting APIs.

## Examples

Request parameters and data attributes in response data [schema objects](https://swagger.io/specification/#schema-object) need the `example` field set in order to provide useful documentation. These are

![Documentation with examples](media/docs_demo_with_examples.png)

With examples, it's clear what to expect. One could even run a mock API server with this content!

![Documentation without examples](media/docs_demo_without_examples.png)

Without examples, as an end-user I don't have much context here to know what these fields' values are going to look like! Links are most likely URLs, not just strings!

## Making the OpenAPI specification available

Every service in the v3 API must publish endpoints that list available versions and fetch specific published versions of the OpenAPI spec for all resources provided by that service to v3. These paths may be prefixed if needed (some services may provide other APIs in addition to v3).

These endpoints need to be defined in the OpenAPI spec at all versions. They are not JSON API resources, and are not themselves versioned. Response type is `application/json`.

### /openapi

Lists the available published versions of the API. Response body is an array of version strings.

### /openapi/{version}

Provides the OpenAPI 3 spec at `{version}` in JSON format. The version is resolved by [the same rules used to match the requested version](../principles/version.md#resolving-versions).
