import type { LoaderArgs, V2_MetaFunction } from '@remix-run/node';
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
import { useLoaderData, useNavigation } from '@remix-run/react';
import { DatePickerWithRange } from '~/components/ui/datePicker';
import { Jira } from '~/lib/jira';

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Janus' }];
};

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url);
  const start = url.searchParams.get('start') ?? undefined;
  const end = url.searchParams.get('end') ?? undefined;
  console.log({ start, end });

  const tempo = new Tempo(process.env.TEMPO_API ?? '');
  const jira = new Jira(
    process.env.JIRA_API ?? '',
    process.env.JIRA_EMAIL ?? '',
  );
  const worklogs = await tempo.worklogs.list({
    from: start,
    to: end,
  });
  const worklogUserIds = await R.pipe(
    worklogs,
    R.uniqBy((item) => item.author.accountId),
    async (items) =>
      await Promise.all(
        items.map((item) => jira.user.get(item.author.accountId)),
      ),
  );

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
      const user = worklogUserIds.find(
        (user) => user.accountId === items[0].author.accountId,
      );
      if (user === undefined) {
        throw new Error('User not found');
      }
      return {
        displayName: user.displayName,
        sumOfTimeSpentInHours,
        sumOfBillableHours,
        percentage,
      };
    }),
    R.toPairs,
  );
  console.log(sumOfTimeSpent.length);
  return sumOfTimeSpent;
}

export default function Index() {
  const data = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  console.log({ navigation });
  return (
    <div className="space-y-4">
      <h1 className="text-3xl">Janus</h1>
      <DatePickerWithRange />
      {navigation.state === 'loading' ? <div>Loading...</div> : null}
      <Table>
        <TableCaption>Time spent by user</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Name</TableHead>
            <TableHead className="text-right">Time Spent in Hours</TableHead>
            <TableHead className="text-right">Billable Hours</TableHead>
            <TableHead className="text-right">Percentage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(([userId, user]) => (
            <TableRow key={userId}>
              <TableCell className="font-medium">{user.displayName}</TableCell>
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
