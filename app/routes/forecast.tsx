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
import { HubSpot } from '~/lib/hubspot';

export async function loader() {
  const hubspot = new HubSpot();
  const deals = await hubspot.deals();
  return { deals };
}

const AuDollar = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
});

export default function Forecast() {
  const { deals } = useLoaderData<typeof loader>();
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
            <TableHead>Name</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => (
            <TableRow key={deal.id}>
              <TableCell className="font-medium">
                {deal.properties.dealname}
              </TableCell>
              <TableCell>{deal.properties.dealstage}</TableCell>
              <TableCell className="text-right">
                {AuDollar.format(parseInt(deal.properties.amount ?? '0'))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
