# n8n-nodes-klussenbeheer

This is an n8n community node. It lets you use [Klussenbeheer](https://samdesk.nl/klussenbeheer/) in your n8n workflows.

Klussenbeheer is field service management for Dutch trades businesses: jobs, customers, quotes and planning in one place.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

In short: in n8n, go to **Settings → Community Nodes**, select **Install**, and enter the package name `n8n-nodes-klussenbeheer`.

## Credentials

1. Log in to Klussenbeheer and open [samdesk.nl/account/mcp/tokens/](https://samdesk.nl/account/mcp/tokens/).
2. Create a new API token. Each token is tied to one organization.
3. Copy the token (you will only see it once) and paste it into the **Klussenbeheer API** credential in n8n.

The credential test calls the API to verify the token works.

## Operations

### Klussenbeheer node

**Job**

- **Search**: search jobs by title, customer name, address or phone number, optionally filtered by stage.
- **Get**: get the full details of a job.
- **Create**: create a new job. Depending on the organization settings, this can send a notification to the account owner or admin.
- **Update**: update an existing job. Only the provided fields are changed. No message is sent to the customer.
- **Change Stage**: change the stage of a job. Existing automations may send a review request to the customer or stop follow-up messages.
- **Schedule**: schedule a job with a start time and optional end time. Connected calendars are synced and, if configured, the customer receives a scheduling notification.
- **Add Note**: add a private note to a job. Nothing is sent to the customer.

**Customer**

- **Search**: search customers by name, email address or phone number.
- **Create**: add a new customer. An existing customer with the same phone number or email address is reused unchanged.
- **Update**: update an existing customer. Only the provided fields are changed.

**Planning**

- **Get**: get the jobs planned for today, tomorrow and the coming week.

### Klussenbeheer Trigger

- **New Job**: polls for new jobs (up to 25 per poll) and starts the workflow for each new job. The first poll only records the current jobs and does not trigger.

Sending emails to customers and sending quotes are intentionally not available in this package, because those actions are irreversible.

## Rate limit

The API allows **120 tool calls per 5 minutes** per token. If you exceed the limit, the node throws an error with a retry hint.

## Compatibility

Tested with n8n 1.x.

## Resources

- [Klussenbeheer](https://samdesk.nl/klussenbeheer/)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## Version history

See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
