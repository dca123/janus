import { LoaderArgs } from '@remix-run/node';
import { format } from 'date-fns';
import { Tempo } from '~/lib/tempo';
import { DEFAULT_DATE_RANGE } from './_index';
import { Jira } from '~/lib/jira';
import * as R from 'remeda';
import { useLoaderData } from '@remix-run/react';
import { Avatar, AvatarImage } from '~/components/ui/avatar';
import { Card, CardContent } from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';
export async function loader({ request, params }: LoaderArgs) {
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
  if (params.id === undefined) {
    throw new Error('User id is undefined');
  }
  const userLogs = await tempo.worklogs.listByUser(params.id, {
    from: start,
    to: end,
  });

  const user = await jira.user.get(params.id);
  return { userLogs, user };
}

export default function Index() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex flex-row space-x-2 items-center p-6 justify-center mx-auto">
        <Avatar>
          <AvatarImage src={user.avatarUrls['48x48']} />
        </Avatar>
        <h1 className="text-lg">{user.displayName}</h1>
      </div>
      <Separator />
    </div>
  );
}
