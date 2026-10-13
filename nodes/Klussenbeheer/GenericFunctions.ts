import { randomUUID } from 'node:crypto';

import { NodeApiError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
} from 'n8n-workflow';

export const BASE_URL = 'https://samdesk.nl';

type ApiContext =
	| IExecuteFunctions
	| IHookFunctions
	| ILoadOptionsFunctions
	| IPollFunctions;

interface KlussenbeheerCredentials {
	token: string;
}

interface JsonRpcResponse {
	error?: { message?: string };
	result?: {
		isError?: boolean;
		content?: Array<{ type?: string; text?: string }>;
	};
}

/**
 * Calls one tool on the Klussenbeheer MCP endpoint (stateless JSON-RPC 2.0)
 * and returns the parsed JSON payload of the tool result.
 */
export async function klussenbeheerApiRequest(
	this: ApiContext,
	toolName: string,
	toolArguments: Record<string, unknown> = {},
): Promise<IDataObject> {
	const { token } = (await this.getCredentials('klussenbeheerApi')) as KlussenbeheerCredentials;

	const response = (await this.helpers.httpRequestWithAuthentication.call(
		this,
		'klussenbeheerApi',
		{
			method: 'POST',
			url: `${BASE_URL}/mcp/${token}/`,
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json, text/event-stream',
			},
			body: {
				jsonrpc: '2.0',
				id: randomUUID(),
				method: 'tools/call',
				params: { name: toolName, arguments: toolArguments },
			},
			json: true,
		},
	)) as JsonRpcResponse;

	if (response.error) {
		throw new NodeApiError(this.getNode(), {
			message: response.error.message ?? 'The request to Klussenbeheer failed.',
		});
	}

	const result = response.result ?? {};
	const text = (result.content ?? []).find((entry) => entry.type === 'text')?.text ?? '{}';
	let payload: IDataObject;
	try {
		payload = JSON.parse(text) as IDataObject;
	} catch {
		payload = { message: text };
	}
	if (result.isError) {
		const message =
			payload.error ?? payload.message ?? 'The operation failed in Klussenbeheer.';
		throw new NodeApiError(this.getNode(), { message: String(message) });
	}
	return payload;
}

/**
 * Copies the provided (non-empty) values from a source object into a new
 * object, renaming the keys from the node parameter names to the API
 * argument names.
 */
export function mapProvidedFields(
	source: Record<string, unknown>,
	keyMap: Record<string, string>,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [localName, apiName] of Object.entries(keyMap)) {
		const value = source[localName];
		if (value !== undefined && value !== null && value !== '') {
			result[apiName] = value;
		}
	}
	return result;
}
