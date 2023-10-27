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
import { addMonths, format, isSameMonth } from 'date-fns';
import {
  DEAL_STAGES,
  DEAL_STAGE_PROBABILITY,
  HubSpot,
  currentFiscalYear,
} from '~/lib/hubspot';

export async function loader() {
  const hubspot = new HubSpot();
  const deals = await hubspot.deals();
  return { deals };
}

const AuDollar = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
});

function monthsInFiscalYear() {
  const { start } = currentFiscalYear();
  console.log(start);
  const months = [];
  for (let index = 0; index < 12; index++) {
    const month = addMonths(start, index);
    months.push(month);
  }
  return months;
}

export default function Forecast() {
  const { deals } = useLoaderData<typeof loader>();
  const months = monthsInFiscalYear();
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex flex-row space-x-2 items-center p-6 justify-center mx-auto">
        <h1 className="text-lg">Forecast</h1>
      </div>
      <Separator />
      <Table>
        <TableCaption>Deals for this fiscal year</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Name</TableHead>
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
              {months.map((month) => (
                <ForecastCell
                  key={`${month.getMonth()}-${deal.id}`}
                  forcast={deal.properties.forecast}
                  calendarDate={month}
                />
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type ForecastCellProps = {
  forcast: {
    month1: {
      date: string;
      amount: number;
    };
    month2: {
      date: string;
      amount: number;
    };
    month3: {
      date: string;
      amount: number;
    };
  };
  calendarDate: Date;
};
function ForecastCell(props: ForecastCellProps) {
  const month1Date = new Date(props.forcast.month1.date);
  const month2Date = new Date(props.forcast.month2.date);
  const month3Date = new Date(props.forcast.month3.date);

  if (isSameMonth(props.calendarDate, month1Date)) {
    return (
      <TableCell className="text-right">
        {AuDollar.format(props.forcast.month1.amount)}
      </TableCell>
    );
  }
  if (isSameMonth(props.calendarDate, month2Date)) {
    return (
      <TableCell className="text-right">
        {AuDollar.format(props.forcast.month2.amount)}
      </TableCell>
    );
  }

  if (isSameMonth(props.calendarDate, month3Date)) {
    return (
      <TableCell className="text-right">
        {AuDollar.format(props.forcast.month3.amount)}
      </TableCell>
    );
  }

  return <TableCell className="text-right">-</TableCell>;
}
