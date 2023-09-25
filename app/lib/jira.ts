import { z } from 'zod';

export class Jira {
  constructor(private apiToken: string, private email: string) {
    this.apiToken = apiToken;
    this.email = email;
  }

  private get authorizationHeader(): string {
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
      const parsedResult = schema.parse(response);
      return parsedResult;
    },
    getAll: async () => {
      const schema = z.array(
        z.object({
          self: z.string(),
          accountId: z.string(),
          accountType: z.union([
            z.literal('atlassian'),
            z.literal('app'),
            z.literal('customer'),
            z.literal('unknown'),
          ]),
          emailAddress: z.string().optional(),
          avatarUrls: z.object({
            '48x48': z.string(),
            '24x24': z.string(),
            '16x16': z.string(),
            '32x32': z.string(),
          }),
          displayName: z.string(),
          active: z.boolean(),
        }),
      );
      const url = new JiraUrl('users');
      url.searchParams.append('maxResults', '1000');
      const response = await this.callApi(url, 'GET');
      const parsedResult = schema.parse(response);
      return parsedResult;
    },
  };
}

type Resource = 'user' | 'users';
class JiraUrl extends URL {
  constructor(resource: Resource) {
    super(`https://parklaneit.atlassian.net/rest/api/3/${resource}`);
  }
}

// const jira = new Jira(
//   process.env.JIRA_API as string,
//   process.env.JIRA_EMAIL as string,
// );

// async function main() {
//   await jira.user.getAll();
// }

// main();
