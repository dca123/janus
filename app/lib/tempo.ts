import { z } from 'zod';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as R from 'remeda';
import { format, startOfMonth } from 'date-fns';

export class Tempo {
  constructor(private apiKey: string) {
    this.apiKey = apiKey;
  }

  private get authorizationHeader(): string {
    return `Bearer ${this.apiKey}`;
  }

  private async callApi(url: TempoUrl, method: string, body?: string) {
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

  public readonly worklogs = {
    list: async (options: { from: string; to: string }) => {
      const schema = z.object({
        self: z.string(),
        metadata: z.object({
          count: z.number(),
          offset: z.number(),
          limit: z.number(),
          previous: z.string().optional(),
          next: z.string().optional(),
        }),
        results: z.array(
          z.object({
            self: z.string(),
            tempoWorklogId: z.number(),
            issue: z.object({ self: z.string(), id: z.number() }),
            timeSpentSeconds: z.number(),
            billableSeconds: z.number(),
            startDate: z.string(),
            startTime: z.string(),
            description: z.string(),
            createdAt: z.string(),
            updatedAt: z.string(),
            author: z.object({ self: z.string(), accountId: z.string() }),
            attributes: z.object({
              self: z.string(),
              values: z.array(z.object({ key: z.string(), value: z.string() })),
            }),
          }),
        ),
      });

      // if (process.env.NODE_ENV === 'development' && existsSync('tempo.json')) {
      //   const file = await readFile('tempo.json', 'utf-8');
      //   return JSON.parse(file) as Promise<z.infer<typeof schema>['results']>;
      // }

      const results = [];

      const url = new TempoUrl('worklogs');
      url.searchParams.append('from', options.from);
      url.searchParams.append('to', options.to);

      const limit = 100;
      let offset = 0;

      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('offset', offset.toString());

      const response = await this.callApi(url, 'GET');
      let parsedResult = schema.parse(response);

      results.push(...parsedResult.results);

      while (parsedResult.metadata.next !== undefined) {
        offset += limit;
        console.log(offset);
        url.searchParams.set('offset', offset.toString());
        const response = await this.callApi(url, 'GET');
        parsedResult = schema.parse(response);
        results.push(...parsedResult.results);
      }

      if (process.env.NODE_ENV === 'development') {
        await writeFile('tempo.json', JSON.stringify(results, null, 2));
      }

      return results;
    },
    listByUser: async (
      accountId: string,
      options: { from: string; to: string },
    ) => {
      const schema = z.object({
        self: z.string(),
        metadata: z.object({
          count: z.number(),
          offset: z.number(),
          limit: z.number(),
          next: z.string().optional(),
        }),
        results: z.array(
          z.object({
            self: z.string(),
            tempoWorklogId: z.number(),
            issue: z.object({ self: z.string(), id: z.number() }),
            timeSpentSeconds: z.number(),
            billableSeconds: z.number(),
            startDate: z.string(),
            startTime: z.string(),
            description: z.string(),
            createdAt: z.string(),
            updatedAt: z.string(),
            author: z.object({ self: z.string(), accountId: z.string() }),
            attributes: z.object({
              self: z.string(),
              values: z.array(z.object({ key: z.string(), value: z.string() })),
            }),
          }),
        ),
      });

      const url = new TempoUrl('worklogs');
      url.pathname += `/user/${accountId}`;
      url.searchParams.append('from', options.from);
      url.searchParams.append('to', options.to);

      const results = [];
      const limit = 100;
      let offset = 0;

      url.searchParams.append('limit', limit.toString());
      url.searchParams.append('offset', offset.toString());

      const response = await this.callApi(url, 'GET');
      let parsedResult = schema.parse(response);
      results.push(...parsedResult.results);

      while (parsedResult.metadata.next !== undefined) {
        offset += limit;
        console.log(offset);
        url.searchParams.set('offset', offset.toString());
        const response = await this.callApi(url, 'GET');
        parsedResult = schema.parse(response);
        results.push(...parsedResult.results);
      }

      return results;
    },
  };
}

type Resource = 'worklogs';
class TempoUrl extends URL {
  constructor(resourse: Resource) {
    super(`https://api.tempo.io/4/${resourse}`);
  }
}

const tempo = new Tempo(process.env.TEMPO_API as string);

async function main() {
  const listByUser = tempo.worklogs.listByUser('6271b8502db3080070245a6f', {
    from: '2023-08-01',
    to: '2023-09-25',
  });
}
// main();
