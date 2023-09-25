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
import {
  useLoaderData,
  useNavigation,
  useSearchParams,
} from '@remix-run/react';
import { Jira } from '~/lib/jira';
import { z } from 'zod';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '~/components/ui/popover';
import { addDays, format } from 'date-fns';
import { CalendarIcon, FilterIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '~/components/ui/form';
import { cn } from '~/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import { Separator } from '~/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';

export const meta: V2_MetaFunction = () => {
  return [{ title: 'Janus' }];
};

const DEFAULT_DATE_RANGE = {
  from: new Date(),
  to: addDays(new Date(), 7),
};

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url);
  const start =
    url.searchParams.get('start') ??
    format(DEFAULT_DATE_RANGE.from, 'yyyy-MM-dd');
  const end =
    url.searchParams.get('end') ?? format(DEFAULT_DATE_RANGE.to, 'yyyy-MM-dd');

  const tempo = new Tempo(process.env.TEMPO_API ?? '');
  const jira = new Jira(
    process.env.JIRA_API ?? '',
    process.env.JIRA_EMAIL ?? '',
  );

  const worklogs = await tempo.worklogs.list({
    from: start,
    to: end,
  });
  const allUsers = await jira.user.getAll();

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
      const user = allUsers.find(
        (user) => user.accountId === items[0].author.accountId,
      );
      if (user === undefined) {
        throw new Error(`User with ${items[0].author.accountId} not found'`);
      }
      return {
        displayName: user.displayName,
        sumOfTimeSpentInHours,
        sumOfBillableHours,
        percentage,
      };
    }),

    R.toPairs,
    R.sortBy(([, user]) => -user.percentage),
  );

  const usersWithoutWorklogs = R.pipe(
    allUsers,
    R.filter(
      (user) => user.accountType === 'atlassian' && user.active === true,
    ),
    R.map(R.pick(['accountId', 'displayName'])),
    R.filter(
      (user) =>
        R.find(sumOfTimeSpent, ([userId]) => userId === user.accountId) ===
        undefined,
    ),
  );
  const averageUtilization = calculateAverageUtilization(worklogs);

  return { sumOfTimeSpent, usersWithoutWorklogs, averageUtilization };
}

const calculateAverageUtilization = (
  worklogs: Array<{
    timeSpentSeconds: number;
    billableSeconds: number;
  }>,
) => {
  const totalBillableSeconds = R.sumBy(
    worklogs,
    (item) => item.billableSeconds,
  );
  const totalTimeSpentSeconds = R.sumBy(
    worklogs,
    (item) => item.timeSpentSeconds,
  );
  return Math.floor((totalBillableSeconds / totalTimeSpentSeconds) * 100);
};

export default function Index() {
  const {
    sumOfTimeSpent: data,
    usersWithoutWorklogs,
    averageUtilization,
  } = useLoaderData<typeof loader>();
  const navigation = useNavigation();

  return (
    <div className="space-y-4">
      <h1 className="text-xl text-center">Janus</h1>
      <DatePickerForm />
      <Separator />
      {navigation.state === 'loading' ? (
        <div>
          <p className="text-muted-foreground">Crunching worklogs ... </p>
        </div>
      ) : null}
      <div>
        <Card className="w-1/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Average Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{averageUtilization}%</p>
          </CardContent>
        </Card>
      </div>
      <Table>
        <TableCaption>
          <TableCaptionText />
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Name</TableHead>
            <TableHead className="text-right">Logged Hours</TableHead>
            <TableHead className="text-right">Billable Hours</TableHead>
            <TableHead className="text-right">Utilization</TableHead>
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
          {usersWithoutWorklogs.map((user) => (
            <TableRow key={user.accountId} className="text-muted-foreground">
              <TableCell className="font-medium">{user.displayName}</TableCell>
              <TableCell className="text-right">0</TableCell>
              <TableCell className="text-right">0</TableCell>
              <TableCell className="text-right">0%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const TableCaptionText = () => {
  const [searchParams] = useSearchParams();
  const from = new Date(searchParams.get('start') ?? DEFAULT_DATE_RANGE.from);
  const to = new Date(searchParams.get('end') ?? DEFAULT_DATE_RANGE.to);
  return (
    <p>
      Hours logged by users from{' '}
      <span className="text-primary">{format(from, 'LLL dd, y')}</span> to{' '}
      <span className="text-primary">{format(to, 'LLL dd, y')}</span>
    </p>
  );
};

const FormSchema = z.object({
  range: z.object({
    from: z.date(),
    to: z.date(),
  }),
});

function DatePickerForm() {
  const [searchParams, setSearchParams] = useSearchParams();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      range: {
        from: new Date(searchParams.get('start') ?? DEFAULT_DATE_RANGE.from),
        to: new Date(searchParams.get('end') ?? DEFAULT_DATE_RANGE.to),
      },
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    const { range } = data;
    setSearchParams((prev) => {
      prev.set('start', format(range.from, 'yyyy-MM-dd'));
      prev.set('end', format(range.to, 'yyyy-MM-dd'));
      return prev;
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        <FormField
          control={form.control}
          name="range"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date Range</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-[240px] pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground',
                      )}
                    >
                      {field.value?.from ? (
                        field.value.to ? (
                          <>
                            {format(field.value.from, 'LLL dd, y')} -{' '}
                            {format(field.value.to, 'LLL dd, y')}
                          </>
                        ) : (
                          format(field.value.from, 'LLL dd, y')
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date('1900-01-01')
                    }
                    defaultMonth={field.value?.from}
                    numberOfMonths={2}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                Select a date range to view the time spent by user
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" size="sm">
          <FilterIcon className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </form>
    </Form>
  );
}
