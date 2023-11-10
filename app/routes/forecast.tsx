import { useLoaderData } from '@remix-run/react';
import { Separator } from '~/components/ui/separator';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { addMonths, format } from 'date-fns';
import {
  DEAL_STAGES,
  DEAL_STAGE_PROBABILITY,
  HubSpot,
  currentFiscalYear,
} from '~/lib/hubspot';
import { Button } from '~/components/ui/button';
import type { SerializeFrom } from '@remix-run/node';
import { mkConfig, generateCsv, download } from 'export-to-csv';
import { zipObj } from 'remeda';
import { Download } from 'lucide-react';

export function monthsInFiscalYear() {
  const { start } = currentFiscalYear();
  const months = [];
  for (let index = 0; index < 12; index++) {
    const month = addMonths(start, index);
    months.push(month);
  }
  return months;
}

export async function loader() {
  const months = monthsInFiscalYear();
  const hubspot = new HubSpot();
  const deals = await hubspot.deals.all();
  const dealIds = deals.map((deal) => deal.id);

  const associatedCompanies = await hubspot.deals.associatedCompanyIds(dealIds);
  const companies = await hubspot.company.byIds(
    associatedCompanies.map((id) => id.to),
  );

  const dealsWithCompanies = deals.map((deal) => {
    let company = companies.find((company) =>
      associatedCompanies.find(
        (association) =>
          association.to === company.id && association.from === deal.id,
      ),
    );
    // if (company === undefined) {
    //   throw new Error(`Could not find company for deal ${deal.id}`);
    // }

    return {
      ...deal,
      company,
    };
  });

  return { dealsWithCompanies, months };
}

const AuDollar = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
});

function generateExportData(
  deals: SerializeFrom<typeof loader>['dealsWithCompanies'],
  months: Array<Date>,
) {
  const data = deals.map((deal) => {
    const forecast = zipObj(
      months.map((m) => format(m, 'MMM / yy')),
      deal.properties.forecast.map((amount) =>
        amount === '-' ? '-' : AuDollar.format(amount),
      ),
    );
    return {
      dealName: deal.properties.dealname,
      company: deal.company ? deal.company.properties.name : '-',
      stage: DEAL_STAGES[deal.properties.dealstage as keyof typeof DEAL_STAGES],
      likelihood:
        DEAL_STAGE_PROBABILITY[
          deal.properties.dealstage as keyof typeof DEAL_STAGE_PROBABILITY
        ] * 100,
      amount: AuDollar.format(deal.properties.amount),
      closeDate: format(new Date(deal.properties.closedate), 'd MMM yyyy'),
      ...forecast,
    };
  });
  return data;
}

const csvConfig = mkConfig({
  title: 'Forecast',
  columnHeaders: [
    { key: 'dealName', displayLabel: 'Deal Name' },
    {
      key: 'company',
      displayLabel: 'Company',
    },
    { key: 'stage', displayLabel: 'Stage' },
    {
      key: 'likelihood',
      displayLabel: 'Likelihood',
    },
    { key: 'amount', displayLabel: 'Amount' },
    {
      key: 'closeDate',
      displayLabel: 'Close Date',
    },
    ...monthsInFiscalYear().map((month) => format(month, 'MMM / yy')),
  ],
});
export default function Forecast() {
  const { dealsWithCompanies: deals, months: unserializedMonths } =
    useLoaderData<typeof loader>();
  const months = unserializedMonths.map((month) => new Date(month));
  const exportData = generateExportData(deals, months);
  const csv = generateCsv(csvConfig)(exportData);
  const handleClick = () => {
    download(csvConfig)(csv);
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex flex-row space-x-2 items-center p-6 justify-center mx-auto">
        <h1 className="text-lg">Forecast</h1>
      </div>
      <div className="self-end">
        <Button onClick={handleClick}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>
      <Separator />
      <Table>
        <TableCaption>Deals for this fiscal year</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead className="text-right">Likelihood</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Close Date</TableHead>
            {months.map((month) => (
              <TableHead key={month.getMonth()}>
                {format(month, 'MMM / yy')}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => (
            <TableRow key={deal.id}>
              <TableCell className="font-medium">
                {deal.properties.dealname}
              </TableCell>
              <TableCell>
                {deal.company ? deal.company.properties.name : '-'}
              </TableCell>
              <TableCell>
                {
                  DEAL_STAGES[
                    deal.properties.dealstage as keyof typeof DEAL_STAGES
                  ]
                }
              </TableCell>
              <TableCell className="text-right">
                {DEAL_STAGE_PROBABILITY[
                  deal.properties
                    .dealstage as keyof typeof DEAL_STAGE_PROBABILITY
                ] * 100}
                %
              </TableCell>
              <TableCell className="text-right">
                {AuDollar.format(deal.properties.amount)}
              </TableCell>
              <TableCell>
                {format(new Date(deal.properties.closedate), 'd MMM yyyy')}
              </TableCell>
              {deal.properties.forecast.map((amount) => (
                <TableCell className="text-right" key={amount}>
                  {amount === '-' ? '-' : AuDollar.format(amount)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
