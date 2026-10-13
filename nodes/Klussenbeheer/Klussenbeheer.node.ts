import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeProperties,
} from 'n8n-workflow';

import { klussenbeheerApiRequest, mapProvidedFields } from './GenericFunctions';

const STAGE_OPTIONS = [
	{ name: 'New', value: 'new_lead' },
	{ name: 'Contact to Make', value: 'contact_to_make' },
	{ name: 'Plan a Site Visit', value: 'site_visit_to_plan' },
	{ name: 'Prepare Quote', value: 'quote_to_prepare' },
	{ name: 'Quote Sent', value: 'quote_sent' },
	{ name: 'Awaiting Response', value: 'awaiting_response' },
	{ name: 'Won', value: 'won' },
	{ name: 'Scheduled', value: 'scheduled' },
	{ name: 'Work Completed', value: 'work_completed' },
	{ name: 'Invoice Sent', value: 'invoice_sent' },
	{ name: 'Completed', value: 'completed' },
	{ name: 'Lost', value: 'lost' },
];

const CUSTOMER_FIELDS: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		default: '',
		description: 'Name of the customer. For business customers: the company name.',
	},
	{
		displayName: 'Phone',
		name: 'phone',
		type: 'string',
		default: '',
		description: 'Phone number of the customer',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'name@email.com',
		default: '',
		description: 'Email address of the customer',
	},
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		default: '',
		description: 'Street of the customer',
	},
	{
		displayName: 'House Number',
		name: 'houseNumber',
		type: 'string',
		default: '',
		description: 'House number, for example "12a"',
	},
	{
		displayName: 'Postal Code',
		name: 'postalCode',
		type: 'string',
		default: '',
		description: 'Postal code of the customer',
	},
	{
		displayName: 'City',
		name: 'city',
		type: 'string',
		default: '',
		description: 'City of the customer',
	},
	{
		displayName: 'Business',
		name: 'business',
		type: 'boolean',
		default: false,
		description: 'Whether the customer is a business (on) or a consumer (off)',
	},
	{
		displayName: 'KvK Number',
		name: 'kvkNumber',
		type: 'string',
		default: '',
		description: 'Dutch chamber of commerce (KvK) number, for business customers',
	},
];

const CUSTOMER_FIELD_MAP: Record<string, string> = {
	name: 'naam',
	phone: 'telefoon',
	email: 'email',
	address: 'adres',
	houseNumber: 'huisnummer',
	postalCode: 'postcode',
	city: 'plaats',
	business: 'zakelijk',
	kvkNumber: 'kvk_nummer',
};

export class Klussenbeheer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Klussenbeheer',
		name: 'klussenbeheer',
		icon: {
			light: 'file:klussenbeheer.svg',
			dark: 'file:klussenbeheer.dark.svg',
		},
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage jobs, customers and the planning in Klussenbeheer',
		defaults: {
			name: 'Klussenbeheer',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'klussenbeheerApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Customer',
						value: 'customer',
						description: 'Search, create and update customers',
					},
					{
						name: 'Job',
						value: 'job',
						description: 'Search and manage jobs',
					},
					{
						name: 'Planning',
						value: 'planning',
						description: 'View the planning for today, tomorrow and the coming week',
					},
				],
				default: 'job',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['job'],
					},
				},
				options: [
					{
						name: 'Add Note',
						value: 'addNote',
						description: 'Add a private note to a job. Nothing is sent to the customer.',
						action: 'Add a note to a job',
					},
					{
						name: 'Change Stage',
						value: 'changeStage',
						description:
							'Change the stage of a job. Existing automations may send a review request to the customer or stop follow-up messages.',
						action: 'Change the stage of a job',
					},
					{
						name: 'Create',
						value: 'create',
						description:
							'Create a new job. Depending on the organization settings, this can send a notification to the account owner or admin.',
						action: 'Create a job',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get the full details of a job',
						action: 'Get a job',
					},
					{
						name: 'Schedule',
						value: 'schedule',
						description:
							'Schedule a job with a start time and optional end time. Connected calendars are synced and, if configured, the customer receives a scheduling notification.',
						action: 'Schedule a job',
					},
					{
						name: 'Search',
						value: 'search',
						description: 'Search jobs by title, customer name, address or phone number',
						action: 'Search jobs',
					},
					{
						name: 'Update',
						value: 'update',
						description:
							'Update an existing job. Only the provided fields are changed. No message is sent to the customer.',
						action: 'Update a job',
					},
				],
				default: 'search',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['customer'],
					},
				},
				options: [
					{
						name: 'Search',
						value: 'search',
						description: 'Search customers by name, email address or phone number',
						action: 'Search customers',
					},
					{
						name: 'Create',
						value: 'create',
						description:
							'Add a new customer. If a customer with the same phone number or email address already exists, it is reused unchanged.',
						action: 'Create a customer',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update an existing customer. Only the provided fields are changed.',
						action: 'Update a customer',
					},
				],
				default: 'search',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['planning'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get the jobs planned for today, tomorrow and the coming week',
						action: 'Get the planning',
					},
				],
				default: 'get',
			},
			// ----------------------------------
			//            Job: search
			// ----------------------------------
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['search'],
					},
				},
				options: [
					{
						displayName: 'Search Term',
						name: 'searchTerm',
						type: 'string',
						default: '',
						description: 'Search in job title, customer name, address and phone number',
					},
					{
						displayName: 'Stage',
						name: 'stage',
						type: 'options',
						options: STAGE_OPTIONS,
						default: '',
						description: 'Only return jobs in this stage',
					},
					{
						displayName: 'Max Results',
						name: 'maxResults',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 25,
							numberPrecision: 0,
						},
						default: 25,
						description: 'Max number of results to return (1-25)',
					},
				],
			},
			// ----------------------------------
			//        Job / Customer: ids
			// ----------------------------------
			{
				displayName: 'Job ID',
				name: 'jobId',
				type: 'number',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['get', 'update', 'changeStage', 'schedule', 'addNote'],
					},
				},
				description: 'The ID of the job',
			},
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'number',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['customer'],
						operation: ['update'],
					},
				},
				description: 'The ID of the customer',
			},
			{
				displayName: 'Search Term',
				name: 'searchTerm',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['customer'],
						operation: ['search'],
					},
				},
				description: 'Search in customer name, email address and phone number. Returns up to 10 customers.',
			},
			// ----------------------------------
			//            Job: update
			// ----------------------------------
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['update'],
					},
				},
				options: [
					{
						displayName: 'Address',
						name: 'address',
						type: 'string',
						default: '',
						description: 'New address of the job',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						typeOptions: {
							rows: 3,
						},
						default: '',
						description: 'New description of the job',
					},
					{
						displayName: 'Estimated Value',
						name: 'estimatedValue',
						type: 'number',
						default: undefined,
						description:
							'New estimated value in euros. Requires financial permissions in Klussenbeheer.',
					},
					{
						displayName: 'House Number',
						name: 'houseNumber',
						type: 'string',
						default: '',
						description: 'New house number (used for customer portal access)',
					},
					{
						displayName: 'Job Type',
						name: 'jobType',
						type: 'string',
						default: '',
						description: 'New job type, for example "Roof inspection"',
					},
					{
						displayName: 'Next Action',
						name: 'nextAction',
						type: 'string',
						default: '',
						description: 'New next action for the job',
					},
					{
						displayName: 'Postal Code',
						name: 'postalCode',
						type: 'string',
						default: '',
						description: 'New postal code (used for customer portal access)',
					},
				],
			},
			// ----------------------------------
			//         Job: change stage
			// ----------------------------------
			{
				displayName: 'Stage',
				name: 'stage',
				type: 'options',
				options: STAGE_OPTIONS,
				default: 'new_lead',
				required: true,
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['changeStage'],
					},
				},
				description: 'The new stage of the job',
			},
			{
				displayName: 'Lost Reason',
				name: 'lostReason',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['changeStage'],
						stage: ['lost'],
					},
				},
				description: 'Only with stage "Lost": why the job was lost',
			},
			// ----------------------------------
			//           Job: schedule
			// ----------------------------------
			{
				displayName: 'Start',
				name: 'start',
				type: 'dateTime',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['schedule'],
					},
				},
				description: 'Start time of the job. Without a timezone, Europe/Amsterdam is used.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['schedule'],
					},
				},
				options: [
					{
						displayName: 'End',
						name: 'end',
						type: 'dateTime',
						default: '',
						description: 'Optional end time of the job. Without a timezone, Europe/Amsterdam is used.',
					},
				],
			},
			// ----------------------------------
			//           Job: add note
			// ----------------------------------
			{
				displayName: 'Note',
				name: 'note',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['addNote'],
					},
				},
				description: 'The text of the private note',
			},
			// ----------------------------------
			//           Job: create
			// ----------------------------------
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['job'],
						operation: ['create'],
					},
				},
				options: [
					{
						displayName: 'Address',
						name: 'address',
						type: 'string',
						default: '',
						description: 'Address of the job',
					},
					{
						displayName: 'Customer Name',
						name: 'customerName',
						type: 'string',
						default: '',
						description: 'Name of the customer',
					},
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						typeOptions: {
							rows: 3,
						},
						default: '',
						description: 'Description of the job',
					},
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
						description: 'Email address of the customer',
					},
					{
						displayName: 'House Number',
						name: 'houseNumber',
						type: 'string',
						default: '',
						description: 'House number of the job',
					},
					{
						displayName: 'Job Type',
						name: 'jobType',
						type: 'string',
						default: '',
						description: 'Type of job, for example "Roof inspection"',
					},
					{
						displayName: 'Next Action',
						name: 'nextAction',
						type: 'string',
						default: '',
						description: 'What should happen next for this job',
					},
					{
						displayName: 'Phone',
						name: 'phone',
						type: 'string',
						default: '',
						description: 'Phone number of the customer',
					},
					{
						displayName: 'Postal Code',
						name: 'postalCode',
						type: 'string',
						default: '',
						description: 'Postal code of the job',
					},
				],
			},
			// ----------------------------------
			//        Customer: create/update
			// ----------------------------------
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['customer'],
						operation: ['create', 'update'],
					},
				},
				options: CUSTOMER_FIELDS,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const operation = this.getNodeParameter('operation', itemIndex) as string;

				let toolName: string;
				let toolArguments: Record<string, unknown> = {};

				if (resource === 'job') {
					switch (operation) {
						case 'search': {
							toolName = 'zoek_klussen';
							const additionalFields = this.getNodeParameter(
								'additionalFields',
								itemIndex,
								{},
							) as Record<string, unknown>;
							toolArguments = mapProvidedFields(additionalFields, {
								searchTerm: 'zoekterm',
								stage: 'fase',
								maxResults: 'limiet',
							});
							break;
						}
						case 'get': {
							toolName = 'klus_detail';
							toolArguments = { klus_id: this.getNodeParameter('jobId', itemIndex) };
							break;
						}
						case 'create': {
							toolName = 'klus_aanmaken';
							const additionalFields = this.getNodeParameter(
								'additionalFields',
								itemIndex,
								{},
							) as Record<string, unknown>;
							toolArguments = mapProvidedFields(additionalFields, {
								customerName: 'naam',
								phone: 'telefoon',
								email: 'email',
								jobType: 'klus_type',
								address: 'adres',
								description: 'omschrijving',
								nextAction: 'volgende_actie',
								postalCode: 'postcode',
								houseNumber: 'huisnummer',
							});
							break;
						}
						case 'update': {
							toolName = 'klus_bijwerken';
							const additionalFields = this.getNodeParameter(
								'additionalFields',
								itemIndex,
								{},
							) as Record<string, unknown>;
							toolArguments = {
								klus_id: this.getNodeParameter('jobId', itemIndex),
								...mapProvidedFields(additionalFields, {
									address: 'adres',
									postalCode: 'postcode',
									houseNumber: 'huisnummer',
									jobType: 'klus_type',
									description: 'omschrijving',
									nextAction: 'volgende_actie',
									estimatedValue: 'geschatte_waarde',
								}),
							};
							break;
						}
						case 'changeStage': {
							toolName = 'fase_wijzigen';
							const additionalFields = this.getNodeParameter(
								'additionalFields',
								itemIndex,
								{},
							) as Record<string, unknown>;
							toolArguments = {
								klus_id: this.getNodeParameter('jobId', itemIndex),
								fase: this.getNodeParameter('stage', itemIndex),
								...mapProvidedFields(additionalFields, { lostReason: 'verloren_reden' }),
							};
							break;
						}
						case 'schedule': {
							toolName = 'klus_inplannen';
							const additionalFields = this.getNodeParameter(
								'additionalFields',
								itemIndex,
								{},
							) as Record<string, unknown>;
							toolArguments = {
								klus_id: this.getNodeParameter('jobId', itemIndex),
								start: this.getNodeParameter('start', itemIndex),
								...mapProvidedFields(additionalFields, { end: 'einde' }),
							};
							break;
						}
						case 'addNote': {
							toolName = 'notitie_toevoegen';
							toolArguments = {
								klus_id: this.getNodeParameter('jobId', itemIndex),
								tekst: this.getNodeParameter('note', itemIndex),
							};
							break;
						}
						default:
							throw new NodeOperationError(
								this.getNode(),
								`Unknown job operation: ${operation}`,
							);
					}
				} else if (resource === 'customer') {
					switch (operation) {
						case 'search': {
							toolName = 'zoek_klanten';
							toolArguments = { zoekterm: this.getNodeParameter('searchTerm', itemIndex) };
							break;
						}
						case 'create': {
							toolName = 'klant_toevoegen';
							const additionalFields = this.getNodeParameter(
								'additionalFields',
								itemIndex,
								{},
							) as Record<string, unknown>;
							toolArguments = mapProvidedFields(additionalFields, CUSTOMER_FIELD_MAP);
							break;
						}
						case 'update': {
							toolName = 'klant_bijwerken';
							const additionalFields = this.getNodeParameter(
								'additionalFields',
								itemIndex,
								{},
							) as Record<string, unknown>;
							toolArguments = {
								klant_id: this.getNodeParameter('customerId', itemIndex),
								...mapProvidedFields(additionalFields, CUSTOMER_FIELD_MAP),
							};
							break;
						}
						default:
							throw new NodeOperationError(
								this.getNode(),
								`Unknown customer operation: ${operation}`,
							);
					}
				} else {
					if (operation !== 'get') {
						throw new NodeOperationError(
							this.getNode(),
							`Unknown planning operation: ${operation}`,
						);
					}
					toolName = 'planning';
				}

				const payload = await klussenbeheerApiRequest.call(this, toolName, toolArguments);
				const list = (payload as IDataObject).items;
				if (operation === 'search' && Array.isArray(list)) {
					// One n8n item per customer or job, so the next node can loop over them.
					for (const entry of list) {
						returnData.push({ json: entry as IDataObject, pairedItem: { item: itemIndex } });
					}
				} else {
					returnData.push({ json: payload, pairedItem: { item: itemIndex } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: itemIndex } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex,
				});
			}
		}

		return [returnData];
	}
}
