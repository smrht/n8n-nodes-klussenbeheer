import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';

import { klussenbeheerApiRequest } from '../Klussenbeheer/GenericFunctions';

const SEARCH_LIMIT = 25;

export class KlussenbeheerTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Klussenbeheer Trigger',
		name: 'klussenbeheerTrigger',
		icon: {
			light: 'file:klussenbeheer.svg',
			dark: 'file:klussenbeheer.dark.svg',
		},
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts the workflow when a new job appears in Klussenbeheer',
		defaults: {
			name: 'Klussenbeheer Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'klussenbeheerApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'New Job',
						value: 'newJob',
						description: 'Triggers when a new job appears in Klussenbeheer',
					},
				],
				default: 'newJob',
				required: true,
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const staticData = this.getWorkflowStaticData('node');
		const knownIds = staticData.knownJobIds;
		const previousIds: string[] | null = Array.isArray(knownIds) ? knownIds.map(String) : null;

		const payload = await klussenbeheerApiRequest.call(this, 'zoek_klussen', {
			limiet: SEARCH_LIMIT,
		});
		const jobs = Array.isArray(payload.items)
			? (payload.items as IDataObject[])
			: [];

		const currentIds = jobs.map((job) => String(job.id));
		staticData.knownJobIds = currentIds;

		// First poll: only store the current ids, do not trigger.
		if (previousIds === null) {
			return [[]];
		}

		const newJobs = jobs.filter((job) => !previousIds.includes(String(job.id)));
		if (newJobs.length === 0) {
			return null;
		}
		return [this.helpers.returnJsonArray(newJobs)];
	}
}
