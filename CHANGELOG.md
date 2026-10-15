# Changelog

## 0.2.0

- The node now talks to the Klussenbeheer REST API (`https://samdesk.nl/api/v1/klussenbeheer/`) instead of the JSON-RPC integration endpoint. Same operations, same parameters, same token.
- Fixed: **Change Stage** with stage "Lost" now actually sends the lost reason to Klussenbeheer. Previously the field existed in the UI but its value was never sent.
- The credential test now calls the lightweight `/me` endpoint.
- Added unit tests for the REST calls, including the lost-reason path.

## 0.1.2

- Search customers and Search jobs now return one item per result, so the next node can work on each customer or job.

## 0.1.1

- Published from GitHub Actions with npm provenance.

## 0.1.0

- Job, Customer and Planning actions, plus the New Job trigger.
