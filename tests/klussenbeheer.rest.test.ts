import { describe, expect, it } from 'vitest';
import type { IExecuteFunctions } from 'n8n-workflow';

import { Klussenbeheer } from '../nodes/Klussenbeheer/Klussenbeheer.node';

interface RecordedRequest {
	method: string;
	url: string;
	body?: Record<string, unknown>;
}

function makeContext(
	parameters: Record<string, unknown>,
	requests: RecordedRequest[],
	response: Record<string, unknown> = { id: 42, service_stage: 'lost' },
) {
	return {
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name: string) => parameters[name],
		getCredentials: async () => ({ token: 'test-token' }),
		getNode: () => ({ name: 'Klussenbeheer' }),
		continueOnFail: () => false,
		helpers: {
			httpRequestWithAuthentication: async (_name: string, options: Record<string, unknown>) => {
				requests.push({
					method: options.method as string,
					url: options.url as string,
					body: options.body as Record<string, unknown> | undefined,
				});
				return { statusCode: 200, body: response };
			},
		},
	} as unknown as IExecuteFunctions;
}

describe('Klussenbeheer node', () => {
	it('change stage to lost sends verloren_reden from the Lost Reason parameter', async () => {
		const node = new Klussenbeheer();
		const requests: RecordedRequest[] = [];
		const context = makeContext(
			{
				resource: 'job',
				operation: 'changeStage',
				jobId: 42,
				stage: 'lost',
				lostReason: 'Prijs was te hoog',
			},
			requests,
		);

		await node.execute.call(context);

		expect(requests).toHaveLength(1);
		expect(requests[0].method).toBe('POST');
		expect(requests[0].url).toContain('/api/v1/klussenbeheer/jobs/42/stage');
		expect(requests[0].body).toEqual({ fase: 'lost', verloren_reden: 'Prijs was te hoog' });
	});

	it('change stage to a non-lost stage never sends verloren_reden', async () => {
		const node = new Klussenbeheer();
		const requests: RecordedRequest[] = [];
		const context = makeContext(
			{
				resource: 'job',
				operation: 'changeStage',
				jobId: 42,
				stage: 'won',
			},
			requests,
		);

		await node.execute.call(context);

		expect(requests).toHaveLength(1);
		expect(requests[0].url).toContain('/api/v1/klussenbeheer/jobs/42/stage');
		expect(requests[0].body).toEqual({ fase: 'won' });
		expect(requests[0].body?.verloren_reden).toBeUndefined();
	});

	it('change stage to lost without a reason omits verloren_reden', async () => {
		const node = new Klussenbeheer();
		const requests: RecordedRequest[] = [];
		const context = makeContext(
			{
				resource: 'job',
				operation: 'changeStage',
				jobId: 42,
				stage: 'lost',
			},
			requests,
		);

		await node.execute.call(context);

		expect(requests[0].body).toEqual({ fase: 'lost' });
	});

	it('search jobs uses the REST search endpoint with query parameters', async () => {
		const node = new Klussenbeheer();
		const requests: RecordedRequest[] = [];
		const context = makeContext(
			{
				resource: 'job',
				operation: 'search',
				additionalFields: { searchTerm: 'dak', stage: 'scheduled', maxResults: 5 },
			},
			requests,
			{ items: [{ id: 1, title: 'Dak' }] },
		);

		const result = await node.execute.call(context);

		expect(requests[0].method).toBe('GET');
		expect(requests[0].url).toContain('/api/v1/klussenbeheer/jobs?');
		expect(requests[0].url).toContain('zoekterm=dak');
		expect(requests[0].url).toContain('fase=scheduled');
		expect(requests[0].url).toContain('limiet=5');
		expect(result[0]).toHaveLength(1);
		expect(result[0][0].json).toEqual({ id: 1, title: 'Dak' });
	});
});
