@php
    $payload = $printableFormPayload;
    $submissionData = $submission ?? null;
    $metadata = data_get($payload, 'metadata', []);
    $summary = data_get($payload, 'summary', []);
    $signOff = data_get($payload, 'sign_off', []);
    $workflowNotes = data_get($payload, 'workflow_notes', []);
    $finalization = data_get($payload, 'finalization', []);
    $normalizePrintableText = static function (mixed $value): string {
        $text = trim((string) $value);

        return preg_replace('/^[\t ]+/m', '', $text) ?? $text;
    };
    $targetPayload = data_get($printableTargetFormPayload ?? null, 'sections', [])
        ? $printableTargetFormPayload
        : null;
    $targetRowsById = collect(data_get($targetPayload, 'sections', []))
        ->flatMap(function (array $section) use ($normalizePrintableText): array {
            return collect(data_get($section, 'rows', []))
                ->mapWithKeys(function (array $row) use ($normalizePrintableText): array {
                    return [
                        $row['id'] => $normalizePrintableText($row['accountable'] ?? ''),
                    ];
                })
                ->all();
        })
        ->all();
    $period = data_get($metadata, 'period', 'IPCR');
    $employeeName = data_get($metadata, 'employee_name', data_get($signOff, 'ratee_name', '—'));
    $employeePosition = data_get($metadata, 'employee_position', '—');
    $documentTitle = data_get($metadata, 'form_title', 'Employee Performance Commitment and Review');
    $generatedAt = now()->format('F j, Y g:i A');

    $statusLabel = $submissionData
        ? (data_get($submissionData, 'finalized_at')
            ? 'Finalized'
            : (data_get($submissionData, 'stage') ?? data_get($submissionData, 'status') ?? 'Draft'))
        : 'Draft Preview';

    $statusClass = match (strtolower((string) $statusLabel)) {
        'finalized', 'approved' => 'status status-emerald',
        'returned', 'rejected' => 'status status-rose',
        default => 'status status-slate',
    };
@endphp
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Printable IPCR Form</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 10mm;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: DejaVu Sans, sans-serif;
            color: #0f172a;
            font-size: 10.5px;
            line-height: 1.45;
            background: #ffffff;
        }

        .sheet {
            width: 100%;
        }

        .header {
            border-bottom: 2px solid #1f2937;
            padding-bottom: 10px;
            margin-bottom: 12px;
        }

        .header-table {
            width: 100%;
            border-collapse: collapse;
        }

        .header-table td {
            vertical-align: top;
        }

        .eyebrow {
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            color: #2f5e2b;
            margin-bottom: 4px;
        }

        h1 {
            margin: 0 0 4px;
            font-size: 18px;
            line-height: 1.2;
        }

        .subtitle {
            margin: 0;
            font-size: 9.5px;
            color: #475569;
            max-width: 640px;
        }

        .status {
            display: inline-block;
            border: 1px solid #cbd5e1;
            border-radius: 999px;
            padding: 4px 10px;
            font-size: 8.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        .status-emerald {
            border-color: #86efac;
            background: #ecfdf5;
            color: #166534;
        }

        .status-rose {
            border-color: #fda4af;
            background: #fff1f2;
            color: #9f1239;
        }

        .status-slate {
            border-color: #cbd5e1;
            background: #f8fafc;
            color: #334155;
        }

        .meta-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }

        .meta-grid td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            vertical-align: top;
        }

        .label {
            margin: 0 0 3px;
            font-size: 7.5px;
            font-weight: 700;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #64748b;
        }

        .value {
            margin: 0;
            font-size: 10px;
            font-weight: 700;
            color: #0f172a;
        }

        .section {
            margin-bottom: 9px;
            page-break-inside: avoid;
        }

        .section-title {
            margin: 0 0 6px;
            font-size: 9.5px;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #334155;
        }

        .section-note {
            margin: 0 0 8px;
            font-size: 9px;
            color: #64748b;
        }

        .rows-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .rows-table th,
        .rows-table td {
            border: 1px solid #cbd5e1;
            padding: 4px 5px;
            vertical-align: top;
            text-align: left;
        }

        .rows-table th {
            background: #f8fafc;
            font-size: 7.5px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #475569;
        }

        .cell-title {
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 3px;
        }

        .cell-note {
            margin-top: 3px;
            color: #334155;
            font-size: 8.5px;
        }

        .cell-note strong {
            color: #0f172a;
        }

        .cell-compact {
            font-size: 9px;
        }

        .cell-text {
            margin: 0;
            display: block;
            width: 100%;
            line-height: 1.35;
            white-space: pre-wrap;
            color: #0f172a;
            text-align: left;
        }

        .target-text {
            margin: 0;
            display: block;
            width: 100%;
            line-height: 1.35;
            color: #0f172a;
            white-space: pre-wrap;
            text-align: left;
        }

        .qeta-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .qeta-table td {
            border: 1px solid #cbd5e1;
            padding: 4px 5px;
            text-align: center;
            vertical-align: top;
        }

        .qeta-label {
            margin: 0;
            font-size: 7px;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #64748b;
        }

        .qeta-value {
            margin: 2px 0 0;
            font-size: 10px;
            font-weight: 700;
            color: #0f172a;
        }

        .summary-grid {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
        }

        .summary-grid td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            width: 25%;
        }

        .workflows {
            width: 100%;
            border-collapse: collapse;
        }

        .workflows td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            width: 33.333%;
            vertical-align: top;
        }

        .sign-name {
            min-height: 28px;
            border-bottom: 1px solid #94a3b8;
            margin-top: 8px;
            padding-bottom: 2px;
            font-weight: 700;
            color: #0f172a;
        }

        .sign-date {
            margin-top: 4px;
            font-size: 8.5px;
            color: #64748b;
        }

        .notes-grid {
            width: 100%;
            border-collapse: collapse;
        }

        .notes-grid td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            vertical-align: top;
        }

        .small {
            font-size: 9px;
            color: #334155;
        }

        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <div class="sheet">
        <div class="header">
            <table class="header-table">
                <tr>
                    <td style="width: 72%;">
                        <div class="eyebrow">Printable PDF View</div>
                        <h1>{{ $documentTitle }}</h1>
                        <p class="subtitle">
                            {{ $period }} | {{ $employeeName }} | {{ $employeePosition }}
                        </p>
                    </td>
                    <td style="width: 28%; text-align: right;">
                        <span class="{{ $statusClass }}">{{ $statusLabel }}</span>
                        <div style="margin-top: 8px; font-size: 8.5px; color: #64748b;">
                            Generated {{ $generatedAt }}
                        </div>
                    </td>
                </tr>
            </table>
        </div>

        <table class="meta-grid">
            <tr>
                <td>
                    <p class="label">Employee</p>
                    <p class="value">{{ $employeeName }}</p>
                </td>
                <td>
                    <p class="label">Position</p>
                    <p class="value">{{ $employeePosition }}</p>
                </td>
                <td>
                    <p class="label">Period</p>
                    <p class="value">{{ $period }}</p>
                </td>
                <td>
                    <p class="label">Final Rating</p>
                    <p class="value">
                        {{ data_get($finalization, 'final_rating') !== null ? number_format((float) data_get($finalization, 'final_rating'), 2) : '—' }}
                    </p>
                </td>
            </tr>
            <tr>
                <td>
                    <p class="label">Adjectival Rating</p>
                    <p class="value">{{ data_get($finalization, 'adjectival_rating') ?? data_get($summary, 'adjectival_rating') ?? '—' }}</p>
                </td>
                <td>
                    <p class="label">Rated Rows</p>
                    <p class="value">{{ data_get($summary, 'rated_rows') ?? '—' }}</p>
                </td>
                <td>
                    <p class="label">Computed Rating</p>
                    <p class="value">
                        {{ data_get($summary, 'computed_rating') !== null ? number_format((float) data_get($summary, 'computed_rating'), 2) : '—' }}
                    </p>
                </td>
                <td>
                    <p class="label">Finalized At</p>
                    <p class="value">
                        {{ data_get($finalization, 'finalized_at') ? \Carbon\Carbon::parse(data_get($finalization, 'finalized_at'))->format('F j, Y g:i A') : '—' }}
                    </p>
                </td>
            </tr>
        </table>

        @foreach ($payload['sections'] as $section)
            <div class="section">
                <h2 class="section-title">{{ $section['title'] }}</h2>
                <table class="rows-table">
                    <colgroup>
                        <col style="width: 23%;">
                        <col style="width: 19%;">
                        <col style="width: 22%;">
                        <col style="width: 17%;">
                        <col style="width: 19%;">
                    </colgroup>
                    <thead>
                        <tr>
                            <th>IPCR Criterion</th>
                            <th>Target (Employee Input)</th>
                            <th>Actual Accomplishment</th>
                            <th>QETA from Evaluator</th>
                            <th>Remarks from Evaluator</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($section['rows'] as $row)
                            <tr>
                                <td>
                                    <div class="cell-title">{{ $row['target'] }}</div>
                                    @if (! empty($row['target_details']))
                                        <div class="cell-note">{{ $normalizePrintableText($row['target_details']) }}</div>
                                    @endif
                                </td>
                                <td class="cell-compact">
                                    <p class="target-text">{!! nl2br(e($normalizePrintableText($targetRowsById[$row['id']] ?? $row['accountable'])) ?: '—') !!}</p>
                                </td>
                                <td class="cell-compact">
                                    <p class="cell-text">{!! nl2br(e($normalizePrintableText($row['actual_accomplishment'] ?? ''))) ?: '—' !!}</p>
                                </td>
                                <td>
                                    <table class="qeta-table">
                                        <tr>
                                            <td style="width: 25%;">
                                                <p class="qeta-label">Q</p>
                                                <p class="qeta-value">{{ data_get($row, 'ratings.quality') ?? '—' }}</p>
                                            </td>
                                            <td style="width: 25%;">
                                                <p class="qeta-label">E</p>
                                                <p class="qeta-value">{{ data_get($row, 'ratings.efficiency') ?? '—' }}</p>
                                            </td>
                                            <td style="width: 25%;">
                                                <p class="qeta-label">T</p>
                                                <p class="qeta-value">{{ data_get($row, 'ratings.timeliness') ?? '—' }}</p>
                                            </td>
                                            <td style="width: 25%;">
                                                <p class="qeta-label">Avg</p>
                                                <p class="qeta-value">{{ data_get($row, 'average') !== null ? number_format((float) data_get($row, 'average'), 2) : '—' }}</p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                                <td class="cell-compact">
                                    <p class="cell-text">{!! nl2br(e($normalizePrintableText($row['remarks'] ?? ''))) ?: '—' !!}</p>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endforeach

        <div class="section">
            <h2 class="section-title">Employee Notes</h2>
            <table class="notes-grid">
                <tr>
                    <td>
                        <p class="label">Employee Notes</p>
                        <p class="small">{!! nl2br(e(data_get($workflowNotes, 'employee_notes') ?: '—')) !!}</p>
                    </td>
                </tr>
            </table>
        </div>

        <div class="section">
            <h2 class="section-title">Workflow Sign-Off</h2>
            <table class="workflows">
                <tr>
                    <td>
                        <div class="label">Ratee</div>
                        <div class="sign-name">{{ data_get($signOff, 'ratee_name') ?? $employeeName }}</div>
                        <div class="sign-date">{{ data_get($signOff, 'ratee_date') ? \Carbon\Carbon::parse(data_get($signOff, 'ratee_date'))->format('F j, Y g:i A') : '—' }}</div>
                    </td>
                    <td>
                        <div class="label">Reviewer</div>
                        <div class="sign-name">{{ data_get($signOff, 'reviewed_by_name') ?? '—' }}</div>
                        <div class="sign-date">{{ data_get($signOff, 'reviewed_by_date') ? \Carbon\Carbon::parse(data_get($signOff, 'reviewed_by_date'))->format('F j, Y g:i A') : '—' }}</div>
                    </td>
                    <td>
                        <div class="label">PMT / Final Rater</div>
                        <div class="sign-name">{{ data_get($signOff, 'pmt_chair_name') ?? '—' }}</div>
                        <div class="sign-date">{{ data_get($signOff, 'pmt_date') ? \Carbon\Carbon::parse(data_get($signOff, 'pmt_date'))->format('F j, Y g:i A') : '—' }}</div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="label">Final Rater</div>
                        <div class="sign-name">{{ data_get($signOff, 'final_rater_name') ?? '—' }}</div>
                        <div class="sign-date">{{ data_get($signOff, 'finalized_date') ? \Carbon\Carbon::parse(data_get($signOff, 'finalized_date'))->format('F j, Y g:i A') : '—' }}</div>
                    </td>
                    <td colspan="2">
                        <div class="label">Finalization Note</div>
                        <div class="small">
                            {{ data_get($finalization, 'finalized_at') ? 'This IPCR has been finalized in the workflow.' : 'This IPCR is being rendered before finalization.' }}
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    </div>
</body>
</html>
