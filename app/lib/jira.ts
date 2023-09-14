import { z } from 'zod';

export class Jira {
  constructor(
    private apiToken: string,
    private email: string,
  ) {
    this.apiToken = apiToken;
    this.email = email;
  }

  get authorizationHeader(): string {
    return `Basic ${Buffer.from(`${this.email}:${this.apiToken}`).toString(
      'base64',
    )}`;
  }

  private async callApi(url: JiraUrl, method: string, body?: string) {
    return (
      await fetch(url, {
        headers: {
          Authorization: this.authorizationHeader,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method,
        body: JSON.stringify(body),
      })
    ).json();
  }

  public readonly user = {
    get: async (accountId: string) => {
      const schema = z.object({
        self: z.string(),
        accountId: z.string(),
        accountType: z.string(),
        emailAddress: z.string(),
        avatarUrls: z.object({
          '48x48': z.string(),
          '24x24': z.string(),
          '16x16': z.string(),
          '32x32': z.string(),
        }),
        displayName: z.string(),
        active: z.boolean(),
        timeZone: z.string(),
        locale: z.string(),
        groups: z.object({ size: z.number(), items: z.array(z.unknown()) }),
        applicationRoles: z.object({
          size: z.number(),
          items: z.array(z.unknown()),
        }),
        expand: z.string(),
      });

      const url = new JiraUrl('user');
      url.searchParams.append('accountId', accountId);

      const response = await this.callApi(url, 'GET');
      console.log(response);
      //   const parsedResult = schema.parse(response);
      return 'parsedResult';
    },
  };
}

type Resource = 'user';
class JiraUrl extends URL {
  constructor(resource: Resource) {
    super(`https://parklaneit.atlassian.net/rest/api/3/${resource}`);
  }
}

const jira = new Jira(
  process.env.JIRA_API as string,
  process.env.JIRA_EMAIL as string,
);

async function main() {
  const users = [
    '618c68ccfba4d0006adabf2d',
    '5c189421ab1c1d35825bbfab',
    '601b6398b7bda90068eb6b36',
    '557058:b3bc7820-09ec-49e5-8fad-a0ef23978209',
    '5f4738a0fdc3f5003ffd7cbc',
    '607ca8339567330069754392',
    '6271b8502db3080070245a6f',
    '63d0a95dce7f4b4e14f9c0e7',
    '622fb39150cceb0070792956',
    '712020:4956e6a2-4d49-49e8-88bc-5f9c6b07c047',
    '630eb8459796033b256bf239',
    '62f4529696eb272011aa8ad4',
    '5dfc107d3aab9f0cafa05469',
  ];

  for (const userId of users) {
    const user = await jira.user.get(userId);
    console.log(user.displayName);
  }
}

main();
