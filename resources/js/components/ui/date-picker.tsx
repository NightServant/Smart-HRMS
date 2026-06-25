"use client"

import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import * as React from "react"
import type { Matcher } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type DatePickerProps = {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  startMonth?: Date
  fromDate?: Date
  toDate?: Date
  disabled?: Matcher | Matcher[]
  hidePreviousMonthButton?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  startMonth,
  fromDate,
  toDate,
  disabled,
  hidePreviousMonthButton = false,
}: DatePickerProps) {
  const [internalDate, setInternalDate] = React.useState<Date>()

  const selectedDate = value ?? internalDate

  const handleSelect = (date: Date | undefined): void => {
    if (onChange) {
      onChange(date)
      return
    }

    setInternalDate(date)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!selectedDate}
          className="data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal"
        >
          <CalendarIcon />
          {selectedDate ? format(selectedDate, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          startMonth={startMonth}
          fromDate={fromDate}
          toDate={toDate}
          disabled={disabled}
          hidePreviousMonthButton={hidePreviousMonthButton}
        />
      </PopoverContent>
    </Popover>
  )
}
