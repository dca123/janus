import type { V2_MetaFunction } from '@remix-run/node';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { Tempo } from '~/lib/tempo';
import * as R from 'remeda';
import { useLoaderData } from '@remix-run/react';

export const meta: V2_MetaFunction = () => {
  return [
    { title: 'New Remix App' },
    { name: 'description', content: 'Welcome to Remix!' },
  ];
};

export async function loader() {
  const tempo = new Tempo(process.env.TEMPO_API ?? '');
  const worklogs = await tempo.worklogs.list();
  const sumOfTimeSpent = R.pipe(
    worklogs,
    R.groupBy((item) => item.author.accountId),
    R.mapValues((items) => {
      const sumOfTimeSpentInHours =
        R.sumBy(items, (item) => item.timeSpentSeconds) / 3600;
      const sumOfBillableHours =
        R.sumBy(items, (item) => item.billableSeconds) / 3600;
      const percentage = Math.floor(
        (sumOfBillableHours / sumOfTimeSpentInHours) * 100,
      );
      return {
        sumOfTimeSpentInHours,
        sumOfBillableHours,
        percentage,
      };
    }),
    R.toPairs,
  );

  return sumOfTimeSpent;
}

export default function Index() {
  const data = useLoaderData<typeof loader>();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Janus</h1>
      <Table>
        <TableCaption>Time spent by user</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">User Id</TableHead>
            <TableHead className="text-right">Time Spen in Hours</TableHead>
            <TableHead className="text-right">Billable Hours</TableHead>
            <TableHead className="text-right">Percentage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(([userId, user]) => (
            <TableRow key={userId}>
              <TableCell className="font-medium">{userId}</TableCell>
              <TableCell className="text-right">
                {user.sumOfTimeSpentInHours}
              </TableCell>
              <TableCell className="text-right">
                {user.sumOfBillableHours}
              </TableCell>
              <TableCell className="text-right">{user.percentage}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
