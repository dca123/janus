import { Client } from '@hubspot/api-client';
import { addMonths, getTime } from 'date-fns';
import { z } from 'zod';

export const DEAL_STAGES = {
  '26411178': 'Lead Opportunity',
  appointmentscheduled: 'Early Discussion',
  qualifiedtobuy: 'Qualified Opportunity',
  decisionmakerboughtin: 'Decision maker bought-In',
  contractsent: 'Contract sent',
  closedwon: 'Closed won',
  closedlost: 'Closed lost',
  '29291955': 'Staging',
  '29281205': 'Delivery - Project',
  '29281206': 'Delivery - Managed Service',
  '29281207': 'Final Invoice',
};

export const DEAL_STAGE_PROBABILITY = {
  '26411178': 0.05,
  appointmentscheduled: 0.2,
  qualifiedtobuy: 0.4,
  decisionmakerboughtin: 0.8,
  contractsent: 0.9,
  closedwon: 1,
};

export function currentFiscalYear() {
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

  async deals() {
    const Schema = z.array(
      z
        .object({
          id: z.string(),
          properties: z.object({
            amount: z.string().nullable(),
            createdate: z.string(),
            closedate: z.string(),
            dealname: z.string(),
            dealstage: z.string(),
            hs_lastmodifieddate: z.string(),
            hs_object_id: z.string(),
          }),
          createdAt: z.date(),
          updatedAt: z.date(),
          archived: z.boolean(),
        })
        .transform((data) => {
          const probability =
            DEAL_STAGE_PROBABILITY[
              data.properties.dealstage as keyof typeof DEAL_STAGE_PROBABILITY
            ];
          const amount = parseFloat(data.properties.amount ?? '0');
          const adjustedAmount = Number(data.properties.amount) * probability;
          const closeDate = new Date(data.properties.closedate);
          const forecast = {
            month1: {
              date: addMonths(closeDate, 1),
              amount: adjustedAmount * 0.4,
            },
            month2: {
              date: addMonths(closeDate, 2),
              amount: adjustedAmount * 0.3,
            },
            month3: {
              date: addMonths(closeDate, 3),
              amount: adjustedAmount * 0.3,
            },
          };
          return {
            ...data,
            properties: {
              ...data.properties,
              amount,
              probability,
              forecast,
            },
          };
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
      properties: ['dealname', 'dealstage', 'amount', 'closedate'],
      sorts: ['dealname'],
    });
    const deals = Schema.parse(response.results);
    return deals;
  }
}

// async function main() {
//   const hubspot = new HubSpot();
//   const deals = await hubspot.dealStages();
//   // console.log(deals);
// }

// main();
