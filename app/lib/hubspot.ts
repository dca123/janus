import { Client } from '@hubspot/api-client';
import { getTime } from 'date-fns';
import { z } from 'zod';

const hubspotClient = new Client({ accessToken: process.env.HUBSPOT_API_KEY });

function currentFiscalYear() {
  const today = new Date();
  const fiscalYearStart = new Date(today.getFullYear(), 6, 1); // July 1st
  if (today < fiscalYearStart) {
    fiscalYearStart.setFullYear(today.getFullYear() - 1);
  }
  const fiscalYearEnd = new Date(fiscalYearStart.getFullYear() + 1, 5, 30); // June 30th of next year
  return {
    start: fiscalYearStart,
    end: fiscalYearEnd,
  };
}

export class HubSpot {
  private client: Client;
  constructor() {
    this.client = new Client({
      accessToken: process.env.HUBSPOT_API_KEY,
    });
  }
  async dealStages() {
    const response = await this.client.crm.properties.coreApi.getByName(
      'deals',
      'dealstage',
      false,
    );
    console.log(response);
  }

  async deals() {
    const Schema = z.array(
      z.object({
        id: z.string(),
        properties: z.object({
          amount: z.string().nullable(),
          createdate: z.string(),
          dealname: z.string(),
          dealstage: z.string(),
          hs_lastmodifieddate: z.string(),
          hs_object_id: z.string(),
        }),
        createdAt: z.date(),
        updatedAt: z.date(),
        archived: z.boolean(),
      }),
    );
    const response = await this.client.crm.deals.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              operator: 'NEQ',
              propertyName: 'dealstage',
              value: 'closedlost',
            },
            {
              operator: 'BETWEEN',
              propertyName: 'closedate',
              highValue: getTime(currentFiscalYear().end).toString(),
              value: getTime(currentFiscalYear().start).toString(),
            },
          ],
        },
      ],
      after: 0,
      limit: 100,
      properties: ['dealname', 'dealstage', 'amount'],
      sorts: ['dealname'],
    });
    const deals = Schema.parse(response.results);
    return deals;
  }
}

// async function main() {
//   const hubspot = new HubSpot();
//   const deals = await hubspot.dealStages();
//   console.log(deals);
// }

// main();
