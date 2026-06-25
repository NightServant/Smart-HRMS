@php
    $payload = $targetFormPayload;
    $sections = data_get($payload, 'sections', []);
    $metadata = data_get($payload, 'metadata', []);
    $employeeName = $employee->name ?? data_get($metadata, 'employee_name', '—');
    $employeePosition = $employee->job_title ?? data_get($metadata, 'employee_position', '—');
    $generatedAt = now()->format('F j, Y g:i A');
    $submittedAt = $target->submitted_at?->format('F j, Y g:i A') ?? '—';
@endphp
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>IPCR Target — {{ $periodLabel }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #1f2937; font-size: 11px; }
        .header { border-bottom: 2px solid #2F5E2B; padding-bottom: 12px; margin-bottom: 16px; }
        .title { font-size: 16px; font-weight: 700; color: #2F5E2B; margin: 0 0 4px 0; }
        .subtitle { font-size: 12px; color: #4b5563; margin: 0; }
        .meta-grid { width: 100%; margin-top: 10px; }
        .meta-grid td { padding: 2px 6px; vertical-align: top; }
        .meta-label { font-weight: 600; color: #374151; width: 130px; }
        .section-title {
            background: #DDEFD7;
            color: #1F3F1D;
            padding: 6px 10px;
            margin-top: 18px;
            font-weight: 700;
            font-size: 12px;
            border-left: 4px solid #2F5E2B;
        }
        table.target-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        table.target-table th {
            background: #2F5E2B;
            color: #fff;
            text-align: left;
            padding: 7px 8px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        table.target-table td {
            border: 1px solid #D4EBC8;
            padding: 7px 8px;
            vertical-align: top;
            font-size: 10.5px;
            line-height: 1.45;
        }
        table.target-table tr:nth-child(even) td { background: #F2FAF0; }
        .col-criteria { width: 32%; }
        .col-measures { width: 30%; }
        .col-target { width: 38%; }
        .footer { margin-top: 18px; font-size: 9.5px; color: #6b7280; text-align: right; }
        .target-detail { color: #4b5563; font-size: 9.5px; margin-top: 3px; white-space: pre-line; }
    </style>
</head>
<body>
    <div class="header">
        <p class="title">Individual Performance Commitment & Review — Target Snapshot</p>
        <p class="subtitle">{{ $periodLabel }}</p>
        <table class="meta-grid">
            <tr>
                <td class="meta-label">Employee</td>
                <td>{{ $employeeName }}</td>
                <td class="meta-label">Submitted At</td>
                <td>{{ $submittedAt }}</td>
            </tr>
            <tr>
                <td class="meta-label">Position</td>
                <td>{{ $employeePosition }}</td>
                <td class="meta-label">Status</td>
                <td>{{ ucfirst($target->status) }}</td>
            </tr>
        </table>
    </div>

    @forelse ($sections as $section)
        <div class="section-title">{{ data_get($section, 'title', 'Section') }}</div>
        <table class="target-table">
            <thead>
                <tr>
                    <th class="col-criteria">Administrative Services Criteria</th>
                    <th class="col-measures">Success Measures</th>
                    <th class="col-target">Target</th>
                </tr>
            </thead>
            <tbody>
                @foreach (data_get($section, 'rows', []) as $row)
                    <tr>
                        <td>
                            <strong>{{ data_get($row, 'target', '') }}</strong>
                            @if (! empty(data_get($row, 'target_details')))
                                <div class="target-detail">{{ data_get($row, 'target_details') }}</div>
                            @endif
                        </td>
                        <td>{!! nl2br(e(data_get($row, 'measures', ''))) !!}</td>
                        <td>{!! nl2br(e(data_get($row, 'accountable', '—') ?: '—')) !!}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @empty
        <p>No target sections available.</p>
    @endforelse

    <div class="footer">Generated {{ $generatedAt }}</div>
</body>
</html>
