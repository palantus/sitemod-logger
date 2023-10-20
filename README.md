# Logger
Request logger module for sitecore.

It can log to your local instance or to a remote/sub. Data can be retrieved using the same API either way.

## Getting requests / statistics

Send a POST to `logger/query` with one or more of the following filters in body as an object:
- path
- userId
- method: GET, POST, etc.
- instance: The instance on which the request originated from. It is taken from System -> Federation -> Identifier. If it is from the local instance, it is "local".
- users (array)
- before: Timestamp (eg.: 2023-10-11T11:57:04.092)
- after: Timestamp (eg.: 2023-10-11T11:57:04.092)
- pathMatch: Regular expression on path
- paths (array)
- query (object)
- uniqueByUsers (array): Will match the first request for a given user, that also matches all the above filters. Can be used to count how many users have called a certain endpoint.
- return: the type to return. Can be one of: count, requests, users, paths. Can be an array for multiple types at once. Default is requests.

Additionally you can send an array of the objects above in body to get multiple results in the same request.