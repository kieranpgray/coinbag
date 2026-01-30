import * as React from 'react';
import * as Popover from '@radix-ui/react-popover';
import { format, parse, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, isValid, parseISO, type Locale } from 'date-fns';
import { enUS, enAU } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { cn, getDateFormat, getWeekStartDay } from '@/lib/utils';
import { useLocale } from '@/contexts/LocaleContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  shouldShowCalendarButton?: boolean;
  allowClear?: boolean; // Whether to show clear button for optional fields
  minDate?: string; // ISO date string
  maxDate?: string; // ISO date string
  disabledDates?: string[]; // Array of ISO date strings
  locale?: string;
  weekStartDay?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  dateFormat?: string; // date-fns format string
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      value,
      onChange: onChangeProp,
      shouldShowCalendarButton = false,
      allowClear = false,
      minDate,
      maxDate,
      disabledDates = [],
      locale: localeProp,
      weekStartDay: weekStartDayProp,
      dateFormat: dateFormatProp,
      className,
      id,
      placeholder = 'Select date',
      ...props
    },
    ref
  ) => {
    // Get locale from context, fallback to prop or default
    let localeContext: string;
    let dateFormat: string;
    let weekStartDay: 0 | 1;
    let dateFnsLocale: Locale;
    
    try {
      const { locale: contextLocale, getDateFormat: getContextDateFormat, getWeekStartDay: getContextWeekStartDay } = useLocale();
      localeContext = localeProp || contextLocale;
      dateFormat = dateFormatProp || getContextDateFormat();
      weekStartDay = weekStartDayProp !== undefined ? (weekStartDayProp as 0 | 1) : getContextWeekStartDay();
    } catch {
      // Fallback if useLocale is not available (shouldn't happen in normal usage)
      localeContext = localeProp || 'en-US';
      dateFormat = dateFormatProp || getDateFormat(localeContext);
      weekStartDay = weekStartDayProp !== undefined ? (weekStartDayProp as 0 | 1) : getWeekStartDay(localeContext);
    }

    // Get date-fns locale object
    dateFnsLocale = localeContext === 'en-AU' ? enAU : enUS;
    const [isOpen, setIsOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState('');
    const [calendarMonth, setCalendarMonth] = React.useState<Date>(() => {
      if (value && typeof value === 'string') {
        try {
          const parsed = parseISO(value);
          return isValid(parsed) ? parsed : new Date();
        } catch {
          return new Date();
        }
      }
      return new Date();
    });
    const inputRef = React.useRef<HTMLInputElement>(null);
    const calendarRef = React.useRef<HTMLDivElement>(null);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Update input value when value prop changes
    React.useEffect(() => {
      if (value && typeof value === 'string') {
        try {
          const parsed = parseISO(value);
          if (isValid(parsed)) {
            setInputValue(format(parsed, dateFormat, { locale: dateFnsLocale }));
            setCalendarMonth(parsed);
          } else {
            setInputValue('');
          }
        } catch {
          setInputValue('');
        }
      } else {
        setInputValue('');
      }
    }, [value, dateFormat]);

    // Update calendar month when value changes
    React.useEffect(() => {
      if (value && typeof value === 'string') {
        try {
          const parsed = parseISO(value);
          if (isValid(parsed)) {
            setCalendarMonth(parsed);
          }
        } catch {
          // Ignore
        }
      }
    }, [value]);

    const handleDateSelect = (date: Date) => {
      const isoDate = format(date, 'yyyy-MM-dd');
      setInputValue(format(date, dateFormat));

      // Call onChange with synthetic event for react-hook-form compatibility
      if (onChangeProp && inputRef.current) {
        const syntheticEvent = {
          target: { ...inputRef.current, value: isoDate },
          currentTarget: { ...inputRef.current, value: isoDate },
        } as React.ChangeEvent<HTMLInputElement>;
        onChangeProp(syntheticEvent);
      }

      setIsOpen(false);
      inputRef.current?.focus();
    };

    const handleClear = () => {
      setInputValue('');
      setCalendarMonth(new Date());

      // Call onChange with synthetic event containing empty string
      if (onChangeProp && inputRef.current) {
        const syntheticEvent = {
          target: { ...inputRef.current, value: '' },
          currentTarget: { ...inputRef.current, value: '' },
        } as React.ChangeEvent<HTMLInputElement>;
        onChangeProp(syntheticEvent);
      }

      setIsOpen(false);
      inputRef.current?.focus();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);

      // Call the onChange prop (from react-hook-form or direct)
      if (onChangeProp) {
        // Try to parse the input value and convert to ISO format
        try {
          const parsed = parse(newValue, dateFormat, new Date(), { locale: dateFnsLocale });
          if (isValid(parsed)) {
            const isoDate = format(parsed, 'yyyy-MM-dd');
            // Create synthetic event with ISO date value
            const syntheticEvent = {
              ...e,
              target: { ...e.target, value: isoDate },
              currentTarget: { ...e.currentTarget, value: isoDate },
            } as React.ChangeEvent<HTMLInputElement>;
            onChangeProp(syntheticEvent);
          } else {
            // Still call onChange with the raw value for validation
            onChangeProp(e);
          }
        } catch {
          // Invalid date, but still call onChange for validation
          onChangeProp(e);
        }
      }
    };

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Call onBlur from props (react-hook-form)
      if (props.onBlur) {
        props.onBlur(e);
      }

      // Validate and format on blur
      if (inputValue) {
        try {
          const parsed = parse(inputValue, dateFormat, new Date(), { locale: dateFnsLocale });
          if (isValid(parsed)) {
            const isoDate = format(parsed, 'yyyy-MM-dd');
            setInputValue(format(parsed, dateFormat, { locale: dateFnsLocale }));
            // Update with ISO date if onChange is provided
            if (onChangeProp && inputRef.current) {
              const syntheticEvent = {
                target: { ...inputRef.current, value: isoDate },
                currentTarget: { ...inputRef.current, value: isoDate },
              } as React.ChangeEvent<HTMLInputElement>;
              onChangeProp(syntheticEvent);
            }
          } else if (value && typeof value === 'string') {
            // Reset to current value if invalid
            const parsed = parseISO(value);
            if (isValid(parsed)) {
              setInputValue(format(parsed, dateFormat, { locale: dateFnsLocale }));
            }
          }
        } catch {
          // Reset to current value if invalid
          if (value && typeof value === 'string') {
            try {
              const parsed = parseISO(value);
              if (isValid(parsed)) {
                setInputValue(format(parsed, dateFormat, { locale: dateFnsLocale }));
              }
            } catch {
              setInputValue('');
            }
          }
        }
      }
    };

    const isDateDisabled = (date: Date): boolean => {
      const isoDate = format(date, 'yyyy-MM-dd');

      // Check disabled array
      if (disabledDates.includes(isoDate)) {
        return true;
      }

      // Check minDate
      if (minDate) {
        try {
          const min = parseISO(minDate);
          if (isValid(min) && date < min) {
            return true;
          }
        } catch {
          // Ignore
        }
      }

      // Check maxDate
      if (maxDate) {
        try {
          const max = parseISO(maxDate);
          if (isValid(max) && date > max) {
            return true;
          }
        } catch {
          // Ignore
        }
      }

      return false;
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
      setCalendarMonth((current) => {
        return direction === 'next' ? addMonths(current, 1) : subMonths(current, 1);
      });
    };

    // Generate calendar days
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: weekStartDay as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: weekStartDay as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const rotatedWeekDays = weekDays.slice(weekStartDay).concat(weekDays.slice(0, weekStartDay));

    const selectedDate = (value && typeof value === 'string') ? (() => {
      try {
        const parsed = parseISO(value);
        return isValid(parsed) ? parsed : null;
      } catch {
        return null;
      }
    })() : null;

    return (
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <div className={cn('relative', className)}>
          <div className="relative flex items-center">
            <Input
              ref={inputRef}
              id={id}
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onClick={() => setIsOpen(true)}
              onFocus={(e) => {
                // Always open popup on focus (tab or click)
                setIsOpen(true);
                // Call onFocus from props if provided
                if (props.onFocus) {
                  props.onFocus(e);
                }
              }}
              placeholder={placeholder}
              className={cn(
                (shouldShowCalendarButton || (allowClear && inputValue)) && 'pr-20'
              )}
              {...props}
            />
            {(allowClear && inputValue) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-10 h-10 w-10 rounded-none border-l-0"
                aria-label="Clear date"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            {shouldShowCalendarButton && (
              <Popover.Trigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute right-0 h-10 w-10 rounded-l-none border-l-0",
                    allowClear && inputValue && "rounded-none"
                  )}
                  aria-label="Open calendar"
                  onClick={() => setIsOpen(true)}
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </Popover.Trigger>
            )}
          </div>

          <Popover.Portal>
            <Popover.Content
              ref={calendarRef}
              className={cn(
                'z-50 w-auto p-4 bg-background border border-border rounded-[12px] shadow-lg',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
                'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'
              )}
              align="start"
              sideOffset={4}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <CalendarContent
                days={days}
                calendarMonth={calendarMonth}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                onMonthNavigate={navigateMonth}
                isDateDisabled={isDateDisabled}
                rotatedWeekDays={rotatedWeekDays}
                dateFnsLocale={dateFnsLocale}
              />
            </Popover.Content>
          </Popover.Portal>
        </div>
      </Popover.Root>
    );
  }
);
DatePicker.displayName = 'DatePicker';

interface CalendarContentProps {
  days: Date[];
  calendarMonth: Date;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  onMonthNavigate: (direction: 'prev' | 'next') => void;
  isDateDisabled: (date: Date) => boolean;
  rotatedWeekDays: string[];
  dateFnsLocale: Locale;
}

const CalendarContent = React.forwardRef<HTMLDivElement, CalendarContentProps>(
  (
    {
      days,
      calendarMonth,
      selectedDate,
      onDateSelect,
      onMonthNavigate,
      isDateDisabled,
      rotatedWeekDays,
      dateFnsLocale,
    },
    ref
  ) => {
    const handleKeyDown = (e: React.KeyboardEvent, date: Date) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isDateDisabled(date)) {
          onDateSelect(date);
        }
      }
    };

    return (
      <div ref={ref} className="w-full">
        {/* Month/Year Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMonthNavigate('prev')}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium text-foreground">
            {format(calendarMonth, 'MMMM yyyy', { locale: dateFnsLocale })}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMonthNavigate('next')}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {rotatedWeekDays.map((day) => (
            <div
              key={day}
              className="text-xs font-medium text-muted-foreground text-center py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, calendarMonth);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            const disabled = isDateDisabled(day);

            return (
              <button
                key={idx}
                type="button"
                onClick={() => !disabled && onDateSelect(day)}
                onKeyDown={(e) => handleKeyDown(e, day)}
                disabled={disabled}
                className={cn(
                  'h-9 w-9 text-sm rounded-md transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0',
                  {
                    'text-muted-foreground opacity-50': !isCurrentMonth,
                    'text-foreground': isCurrentMonth && !isSelected && !isTodayDate,
                    'bg-primary text-primary-foreground font-semibold': isSelected,
                    'hover:bg-muted': isCurrentMonth && !isSelected && !disabled,
                    'font-semibold border border-primary': isTodayDate && !isSelected,
                    'cursor-not-allowed opacity-50': disabled,
                    'hover:bg-transparent': disabled,
                  }
                )}
                aria-label={format(day, 'EEEE, MMMM d, yyyy', { locale: dateFnsLocale })}
                aria-disabled={disabled}
                aria-selected={isSelected ?? undefined}
              >
                {format(day, 'd', { locale: dateFnsLocale })}
              </button>
            );
          })}
        </div>
      </div>
    );
  }
);
CalendarContent.displayName = 'CalendarContent';

export { DatePicker };

