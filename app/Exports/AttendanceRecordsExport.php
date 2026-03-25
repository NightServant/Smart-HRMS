<?php

namespace App\Exports;

use App\Models\AttendanceRecord;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class AttendanceRecordsExport implements FromCollection, WithHeadings
{
    public function __construct(private readonly string $search = '')
    {
    }

    /**
     * @return Collection<int, array<string, int|string|null>>
     */
    public function collection(): Collection
    {
        return AttendanceRecord::query()
            ->with('employee')
            ->when(trim($this->search) !== '', function ($query): void {
                $query->where(function ($subQuery): void {
                    $subQuery
                        ->whereHas('employee', fn ($q) => $q->where('name', 'like', '%'.trim($this->search).'%'))
                        ->orWhere('date', 'like', '%'.trim($this->search).'%')
                        ->orWhere('status', 'like', '%'.trim($this->search).'%');
                });
            })
            ->orderByDesc('date')
            ->get()
            ->map(fn (AttendanceRecord $record): array => [
                'id' => $record->id,
                'employee_name' => $record->employee?->name ?? 'Unknown',
                'date' => $record->date?->format('Y-m-d') ?? '',
                'punch_time' => $record->punch_time?->format('H:i:s') ?? '',
                'status' => $record->status,
            ]);
    }

    /**
     * @return array<int, string>
     */
    public function headings(): array
    {
        return ['ID', 'Employee Name', 'Date', 'Punch Time', 'Status'];
    }
}
