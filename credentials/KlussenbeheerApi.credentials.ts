import type { ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class KlussenbeheerApi implements ICredentialType {
	name = 'klussenbeheerApi';

	displayName = 'Klussenbeheer API';

	icon = 'file:klussenbeheer.svg' as const;

	documentationUrl = 'https://samdesk.nl/klussenbeheer/';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'token',
			type: 'string',
			required: true,
			typeOptions: {
				password: true,
			},
			default: '',
			noDataExpression: true,
			description:
				'The MCP token for your Klussenbeheer organization. Create one at https://samdesk.nl/account/mcp/tokens/.',
			hint: 'Create the token in Klussenbeheer under account/mcp/tokens/. Each token is tied to one organization.',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			method: 'POST',
			url: '=https://samdesk.nl/mcp/{{ $credentials.token }}/',
			headers: {
				'Content-Type': 'application/json',
			},
			body: {
				jsonrpc: '2.0',
				id: 1,
				method: 'tools/list',
				params: {},
			},
			json: true,
		},
	};
}
