import * as React from 'react';
import { format, addDays, set } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import type { DateRange } from 'react-day-picker';
import { useSearchParams } from '@remix-run/react';

export function DatePickerWithRange({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(searchParams.get('start') ?? ''),
    to: new Date(searchParams.get('end') ?? ''),
  });

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !date && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} -{' '}
                  {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={(range) => {
              console.log(range);
              setDate(range);
              if (range === undefined) return;
              if (range.from === undefined || range.to === undefined) return;
              setSearchParams((prev) => {
                prev.set('start', format(range.from, 'yyyy-MM-dd'));
                prev.set('end', format(range.to, 'yyyy-MM-dd'));
                return prev;
              });
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
