import { SearchBar, FilterSelect } from '@/components/ui/search-bar'
import { DateRangePicker } from './date-range-picker'

const EVENT_TYPE_OPTIONS = [
  { label: 'All Events',       value: ''               },
  { label: 'Create',           value: 'create'         },
  { label: 'Update',           value: 'update'         },
  { label: 'Delete',           value: 'delete'         },
  { label: 'Login',            value: 'login'          },
  { label: 'Auth',             value: 'auth'           },
]

interface AuditFiltersProps {
  search: string
  eventType: string
  actor: string
  dateFrom: string
  dateTo: string
  onSearchChange: (v: string) => void
  onEventTypeChange: (v: string) => void
  onActorChange: (v: string) => void
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
}

export function AuditFilters({
  search, eventType, actor, dateFrom, dateTo,
  onSearchChange, onEventTypeChange, onActorChange, onDateFromChange, onDateToChange,
}: AuditFiltersProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={onSearchChange}
          placeholder="Search resource or ID…"
          className="w-56"
        />
        <FilterSelect
          label="Event Type"
          value={eventType}
          onChange={onEventTypeChange}
          options={EVENT_TYPE_OPTIONS}
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Actor:</label>
          <input
            className="input py-1.5 text-sm w-40"
            value={actor}
            onChange={e => onActorChange(e.target.value)}
            placeholder="Filter by actor…"
          />
        </div>
      </div>
      <DateRangePicker
        from={dateFrom}
        to={dateTo}
        onFromChange={onDateFromChange}
        onToChange={onDateToChange}
      />
    </div>
  )
}
