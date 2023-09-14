import { z } from 'zod';
import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import * as R from 'remeda';

export class Tempo {
  constructor(private apiKey: string) {
    this.apiKey = apiKey;
  }

  get authorizationHeader(): string {
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
    list: async () => {
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

      if (existsSync('tempo.json')) {
        const file = await readFile('tempo.json', 'utf-8');
        return JSON.parse(file) as Promise<z.infer<typeof schema>['results']>;
      }

      const results = [];

      const url = new TempoUrl('worklogs');
      url.searchParams.append('from', '2023-08-01');
      url.searchParams.append('to', '2023-09-07');

      const limit = 30;
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

      await writeFile('tempo.json', JSON.stringify(results, null, 2));

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
  const worklogs = await tempo.worklogs.list();
  const sumOfTimeSpent = R.pipe(
    worklogs,
    R.groupBy((item) => item.author.accountId),
    R.mapValues((items) => {
      const sumOfTimeSpent = R.sumBy(items, (item) => item.timeSpentSeconds);
      const sumOfBillableSeconds = R.sumBy(
        items,
        (item) => item.billableSeconds,
      );
      const percentage = (sumOfBillableSeconds / sumOfTimeSpent) * 100;
      return {
        sumOfTimeSpent,
        sumOfBillableSeconds,
        percentage,
      };
    }),
  );
  console.log(sumOfTimeSpent);
  console.log(Object.keys(sumOfTimeSpent).length);
}

main();
