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
    $generatedAt = now()->format('F j, Y g:i A');

    $evaluatorGaveRemarks = data_get($submissionData, 'evaluator_gave_remarks', false);
    $evaluatorPassFail = data_get($submissionData, 'evaluator_pass_fail')
        ?? data_get($workflowNotes, 'evaluator_pass_fail');
    $evaluatorRemarks = data_get($workflowNotes, 'evaluator_remarks')
        ?? data_get($submissionData, 'rejection_reason');

    $computedRating = data_get($finalization, 'final_rating')
        ?? data_get($summary, 'computed_rating');
    $adjectivalRating = data_get($finalization, 'adjectival_rating')
        ?? data_get($summary, 'adjectival_rating');
@endphp
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>IPCR Form</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 10mm 10mm 12mm 10mm;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: DejaVu Sans, sans-serif;
            color: #0f172a;
            font-size: 9px;
            line-height: 1.4;
            background: #ffffff;
        }

        /* ── Gov Header ───────────────────────────────── */
        .gov-header {
            text-align: center;
            margin-bottom: 6px;
        }

        .gov-header .republic {
            font-size: 8px;
            font-style: italic;
            color: #334155;
        }

        .gov-header .org-name {
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #0f172a;
            margin: 2px 0;
        }

        .gov-header .form-title {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin: 2px 0 0;
        }

        .gov-header .form-subtitle {
            font-size: 8px;
            color: #475569;
            margin: 1px 0 0;
        }

        .divider {
            border: none;
            border-top: 2px solid #1f2937;
            margin: 5px 0;
        }

        /* ── Commitment Paragraph ─────────────────────── */
        .commitment {
            font-size: 8.5px;
            line-height: 1.5;
            margin-bottom: 6px;
            text-align: justify;
        }

        /* ── Pre-table signatory ──────────────────────── */
        .pre-signatory {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
        }

        .pre-signatory td {
            width: 50%;
            padding: 4px 0;
            vertical-align: bottom;
        }

        .sign-line {
            display: inline-block;
            min-width: 200px;
            border-bottom: 1px solid #334155;
            font-weight: 700;
            font-size: 9px;
            padding-bottom: 1px;
        }

        .sign-role {
            font-size: 7.5px;
            color: #64748b;
            margin-top: 1px;
        }

        /* ── Main IPCR Table ──────────────────────────── */
        .ipcr-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            margin-bottom: 4px;
        }

        .ipcr-table th,
        .ipcr-table td {
            border: 1px solid #64748b;
            padding: 3px 4px;
            vertical-align: top;
            text-align: left;
        }

        .ipcr-table th {
            background: #e2e8f0;
            font-size: 7.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            text-align: center;
            color: #1e293b;
        }

        .ipcr-table th.header-main {
            background: #cbd5e1;
            font-size: 8px;
        }

        .section-heading-row td {
            background: #f1f5f9;
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #334155;
            padding: 4px 6px;
        }

        .section-mfo-row td {
            background: #dde4ed;
            font-size: 8.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #1e293b;
            padding: 4px 6px;
        }

        .indicator-cell {
            font-size: 8.5px;
        }

        .indicator-title {
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 2px;
        }

        .indicator-detail {
            color: #334155;
            font-size: 8px;
            margin-bottom: 2px;
        }

        .target-ref {
            font-size: 7.5px;
            color: #475569;
            border-top: 1px dashed #cbd5e1;
            margin-top: 3px;
            padding-top: 2px;
        }

        .target-ref-label {
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #64748b;
        }

        .actual-cell {
            font-size: 8.5px;
            white-space: pre-wrap;
        }

        .rating-cell {
            text-align: center;
            font-size: 9px;
            font-weight: 700;
        }

        .rating-avg {
            font-size: 9.5px;
            font-weight: 700;
            color: #0f172a;
        }

        .remarks-cell {
            font-size: 8.5px;
            white-space: pre-wrap;
        }

        /* ── Final Average Row ────────────────────────── */
        .final-row td {
            background: #e2e8f0;
            font-weight: 700;
            font-size: 9px;
        }

        /* ── Evaluator Assessment Box ─────────────────── */
        .assessment-box {
            border: 1.5px solid #334155;
            padding: 6px 8px;
            margin-bottom: 8px;
            page-break-inside: avoid;
        }

        .assessment-title {
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            color: #334155;
            border-bottom: 1px solid #94a3b8;
            padding-bottom: 3px;
            margin-bottom: 5px;
        }

        .assessment-grid {
            width: 100%;
            border-collapse: collapse;
        }

        .assessment-grid td {
            vertical-align: top;
            padding: 0 6px 0 0;
        }

        .pass-badge {
            display: inline-block;
            border-radius: 3px;
            padding: 3px 12px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.12em;
        }

        .pass-badge-passed {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #86efac;
        }

        .pass-badge-failed {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fca5a5;
        }

        .pass-badge-pending {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
        }

        .assessment-remarks {
            font-size: 8.5px;
            white-space: pre-wrap;
            color: #1e293b;
            line-height: 1.45;
        }

        /* ── Final Signatory ──────────────────────────── */
        .sign-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
        }

        .sign-table td {
            border: 1px solid #64748b;
            padding: 5px 8px;
            width: 33.333%;
            vertical-align: top;
        }

        .sign-role-label {
            font-size: 7px;
            font-weight: 700;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #64748b;
            margin-bottom: 12px;
        }

        .sign-name-line {
            border-bottom: 1px solid #334155;
            min-height: 16px;
            font-weight: 700;
            font-size: 9px;
            padding-bottom: 1px;
        }

        .sign-date-line {
            margin-top: 3px;
            font-size: 7.5px;
            color: #64748b;
        }

        .generated-note {
            text-align: right;
            font-size: 7px;
            color: #94a3b8;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <!-- Government Header -->
    <div class="gov-header">
        <div class="republic">Republic of the Philippines</div>
        <div class="org-name">Provincial Government of Tarlac</div>
        <div class="form-title">Individual Performance Commitment and Review (IPCR)</div>
        <div class="form-subtitle">Performance Period: {{ $period }}</div>
    </div>

    <hr class="divider">

    <!-- Commitment Paragraph -->
    <p class="commitment">
        I, <strong>{{ $employeeName }}</strong>, {{ $employeePosition }}, of the Provincial Government of Tarlac commit to deliver
        and agree to be rated on the attainment of the following targets in accordance with the indicated measures
        for the period <strong>{{ $period }}</strong>.
    </p>

    <!-- Pre-table signatory -->
    <table class="pre-signatory">
        <tr>
            <td>
                <span class="sign-line">{{ $employeeName }}</span>
                <div class="sign-role">Ratee &mdash; {{ data_get($signOff, 'ratee_date') ? \Carbon\Carbon::parse(data_get($signOff, 'ratee_date'))->format('F j, Y') : 'Date' }}</div>
            </td>
            <td>
                <span class="sign-line">{{ data_get($signOff, 'reviewed_by_name') ?? '&nbsp;' }}</span>
                <div class="sign-role">Immediate Supervisor / Reviewer &mdash; {{ data_get($signOff, 'reviewed_by_date') ? \Carbon\Carbon::parse(data_get($signOff, 'reviewed_by_date'))->format('F j, Y') : 'Date' }}</div>
            </td>
        </tr>
    </table>

    <!-- Main IPCR Table -->
    <table class="ipcr-table">
        <colgroup>
            <col style="width: 26%;">
            <col style="width: 27%;">
            <col style="width: 5%;">
            <col style="width: 5%;">
            <col style="width: 5%;">
            <col style="width: 7%;">
            <col style="width: 25%;">
        </colgroup>
        <thead>
            <tr>
                <th class="header-main">Success Indicators<br><span style="font-weight:400;font-size:7px;text-transform:none;letter-spacing:0;">(Targets &amp; Measures)</span></th>
                <th class="header-main">Actual Accomplishments</th>
                <th class="header-main" colspan="4">Rating</th>
                <th class="header-main">Remarks</th>
            </tr>
            <tr>
                <th></th>
                <th></th>
                <th>Q</th>
                <th>E</th>
                <th>T</th>
                <th>Avg</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            @foreach ($payload['sections'] as $section)
                <tr class="section-mfo-row">
                    <td colspan="7">{{ $section['title'] }}</td>
                </tr>
                @foreach ($section['rows'] as $row)
                    <tr>
                        <td class="indicator-cell" style="padding-left: 8px;">
                            <div class="indicator-title">{{ $row['target'] }}</div>
                            @if (! empty($row['target_details']))
                                <div class="indicator-detail">{{ $normalizePrintableText($row['target_details']) }}</div>
                            @endif
                            @php $committedTarget = $normalizePrintableText($targetRowsById[$row['id']] ?? $row['accountable'] ?? ''); @endphp
                            @if ($committedTarget !== '')
                                <div class="target-ref">
                                    <span class="target-ref-label">Committed Target: </span>{{ $committedTarget }}
                                </div>
                            @endif
                        </td>
                        <td class="actual-cell">{{ $normalizePrintableText($row['actual_accomplishment'] ?? '') ?: '—' }}</td>
                        <td class="rating-cell">{{ data_get($row, 'ratings.quality') ?? '—' }}</td>
                        <td class="rating-cell">{{ data_get($row, 'ratings.efficiency') ?? '—' }}</td>
                        <td class="rating-cell">{{ data_get($row, 'ratings.timeliness') ?? '—' }}</td>
                        <td class="rating-cell rating-avg">
                            {{ data_get($row, 'average') !== null ? number_format((float) data_get($row, 'average'), 2) : '—' }}
                        </td>
                        <td class="remarks-cell">{{ $normalizePrintableText($row['remarks'] ?? '') ?: '—' }}</td>
                    </tr>
                @endforeach
            @endforeach

            <!-- Final Average Row -->
            <tr class="final-row">
                <td colspan="4" style="text-align: right; font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase;">Final Average Rating</td>
                <td class="rating-cell rating-avg" style="font-size: 10px;">
                    {{ $computedRating !== null ? number_format((float) $computedRating, 2) : '—' }}
                </td>
                <td colspan="2" style="font-size: 8px;">
                    <strong>{{ $adjectivalRating ?? '—' }}</strong>
                </td>
            </tr>
        </tbody>
    </table>


    <!-- Final Signatory Block -->
    <table class="sign-table">
        <tr>
            <td>
                <div class="sign-role-label">Ratee</div>
                <div class="sign-name-line">{{ $employeeName }}</div>
                <div class="sign-date-line">
                    {{ data_get($signOff, 'ratee_date') ? \Carbon\Carbon::parse(data_get($signOff, 'ratee_date'))->format('F j, Y') : '&nbsp;' }}
                </div>
            </td>
            <td>
                <div class="sign-role-label">Immediate Supervisor</div>
                <div class="sign-name-line">{{ data_get($signOff, 'reviewed_by_name') ?? '&nbsp;' }}</div>
                <div class="sign-date-line">
                    {{ data_get($signOff, 'reviewed_by_date') ? \Carbon\Carbon::parse(data_get($signOff, 'reviewed_by_date'))->format('F j, Y') : '&nbsp;' }}
                </div>
            </td>
            <td>
                <div class="sign-role-label">Head of Office / PMT</div>
                <div class="sign-name-line">{{ data_get($signOff, 'pmt_chair_name') ?? data_get($signOff, 'final_rater_name') ?? '&nbsp;' }}</div>
                <div class="sign-date-line">
                    {{ data_get($signOff, 'pmt_date') ? \Carbon\Carbon::parse(data_get($signOff, 'pmt_date'))->format('F j, Y') : (data_get($signOff, 'finalized_date') ? \Carbon\Carbon::parse(data_get($signOff, 'finalized_date'))->format('F j, Y') : '&nbsp;') }}
                </div>
            </td>
        </tr>
    </table>

    <div class="generated-note">Generated {{ $generatedAt }} &mdash; Smart HRMS &mdash; Provincial Government of Tarlac</div>
</body>
</html>
