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
				'The API token for your Klussenbeheer organization. Create one in Klussenbeheer under Account, section AI integrations.',
			hint: 'Each token is tied to one organization.',
		},
	];

	test: ICredentialTestRequest = {
		request: {
			method: 'GET',
			url: '=https://samdesk.nl/api/v1/klussenbeheer/me',
			headers: {
				Authorization: '=Bearer {{ $credentials.token }}',
			},
		},
	};
}
