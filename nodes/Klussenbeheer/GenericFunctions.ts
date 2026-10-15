import { NodeApiError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';

export const BASE_URL = 'https://samdesk.nl';

export const API_BASE_PATH = '/api/v1/klussenbeheer';

type ApiContext =
	| IExecuteFunctions
	| IHookFunctions
	| ILoadOptionsFunctions
	| IPollFunctions;

interface KlussenbeheerCredentials {
	token: string;
}

interface FullResponse {
	statusCode?: number;
	body?: unknown;
	data?: unknown;
}

/**
 * Performs one REST call against the Klussenbeheer API and returns the
 * parsed JSON response.
 */
export async function klussenbeheerApiRequest(
	this: ApiContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: Record<string, unknown>,
): Promise<IDataObject> {
	const { token } = (await this.getCredentials('klussenbeheerApi')) as KlussenbeheerCredentials;

	const options: IHttpRequestOptions = {
		method,
		url: `${BASE_URL}${API_BASE_PATH}${endpoint}`,
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${token}`,
		},
		json: true,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
	};
	if (body !== undefined) {
		options.body = body;
	}

	let response: FullResponse;
	try {
		response = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'klussenbeheerApi',
			options,
		)) as FullResponse;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}

	const statusCode =
		typeof response?.statusCode === 'number' ? response.statusCode : 200;
	let payload: IDataObject;
	const rawBody = response?.body ?? response?.data;
	if (typeof rawBody === 'string') {
		try {
			payload = JSON.parse(rawBody) as IDataObject;
		} catch {
			payload = { message: rawBody };
		}
	} else {
		payload = (rawBody ?? {}) as IDataObject;
	}

	if (statusCode >= 400) {
		const detail = payload.detail ?? payload.message;
		const message =
			typeof detail === 'string' && detail
				? detail
				: `The request to Klussenbeheer failed (HTTP ${statusCode}).`;
		throw new NodeApiError(this.getNode(), { message });
	}

	return payload;
}

/**
 * Builds a query string from an object, skipping empty values.
 */
export function buildQuery(params: Record<string, unknown>): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === '') {
			continue;
		}
		search.set(key, String(value));
	}
	const query = search.toString();
	return query ? `?${query}` : '';
}

/**
 * Copies the provided (non-empty) values from a source object into a new
 * object, renaming the keys from the node parameter names to the API
 * field names.
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
