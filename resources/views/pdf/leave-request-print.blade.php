@php
    $leave = $leaveRequest;
    $dhDecision = (int) data_get($leave, 'dhDecision', 0);
    $hrDecision = (int) data_get($leave, 'hrDecision', 0);
    $rawStatus = (string) data_get($leave, 'status', 'pending');
    $status = match (true) {
        $dhDecision === 2 || $hrDecision === 2 || $rawStatus === 'returned' => 'Rejected',
        $dhDecision === 1 && $hrDecision === 1 && in_array($rawStatus, ['completed', 'finalized'], true) => 'Approved',
        in_array($rawStatus, ['routed', 'pending', 'draft'], true) => 'Pending',
        default => ucfirst(str_replace('_', ' ', $rawStatus)),
    };
    $statusClass = match ($status) {
        'Approved' => 'status status-emerald',
        'Rejected' => 'status status-rose',
        default => 'status status-slate',
    };
    $supportingDocuments = data_get($leave, 'supportingDocuments', []);
    $generatedAt = now()->format('F j, Y g:i A');
    $daysRequested = data_get($leave, 'daysRequested');
    $leaveAccrualComputation = $daysRequested !== null
        ? number_format((float) $daysRequested, 2).' day(s)'
        : '—';

    $formatDate = static function (?string $value): string {
        if (! $value) {
            return '—';
        }

        return \Carbon\Carbon::parse($value)->format('F j, Y');
    };

    $formatTimestamp = static function (?string $value): string {
        if (! $value) {
            return '—';
        }

        return \Carbon\Carbon::parse($value)->format('F j, Y g:i A');
    };

    $decisionLabel = static function (int $decision): string {
        return match ($decision) {
            1 => 'Approved',
            2 => 'Rejected',
            default => 'Pending',
        };
    };
@endphp
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Application for Leave</title>
    <style>
        @page {
            size: letter portrait;
            margin: 12mm;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: DejaVu Sans, sans-serif;
            color: #0f172a;
            font-size: 10px;
            line-height: 1.42;
            background: #ffffff;
        }

        .sheet {
            width: 100%;
        }

        .header {
            border-bottom: 2px solid #1f2937;
            padding-bottom: 8px;
            margin-bottom: 10px;
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
            margin-bottom: 10px;
        }

        .meta-grid td {
            border: 1px solid #cbd5e1;
            padding: 7px 9px;
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
            margin-bottom: 10px;
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

        .info-table,
        .decision-table,
        .documents-table,
        .sign-off-table {
            width: 100%;
            border-collapse: collapse;
        }

        .info-table,
        .decision-table {
            table-layout: fixed;
        }

        .info-table td,
        .decision-table td,
        .documents-table th,
        .documents-table td,
        .sign-off-table td {
            border: 1px solid #cbd5e1;
            padding: 6px 7px;
            vertical-align: top;
        }

        .info-table .value-block {
            min-height: 22px;
            border-bottom: 1px solid #94a3b8;
            padding-bottom: 2px;
            font-weight: 700;
            color: #0f172a;
        }

        .decision-table td {
            width: 33.333%;
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

        .reason-box {
            border: 1px solid #cbd5e1;
            padding: 9px 10px;
            min-height: 52px;
        }

        .reason-text {
            margin: 0;
            white-space: pre-wrap;
            color: #0f172a;
        }

        .sign-off-table {
            width: 100%;
            border-collapse: collapse;
        }

        .sign-off-table td {
            vertical-align: top;
            width: 33.333%;
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

        .documents-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .documents-table th,
        .documents-table td {
            vertical-align: top;
        }

        .documents-table th {
            background: #f8fafc;
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #475569;
        }

        .small {
            font-size: 9px;
            color: #334155;
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
                        <h1>Application for Leave</h1>
                        <p class="subtitle">
                            CS Form No. 6, Revised 2020 | Employee leave application, review outcome, workflow sign-off, and supporting documents.
                        </p>
                    </td>
                    <td style="width: 28%; text-align: right;">
                        <span class="{{ $statusClass }}">{{ $status }}</span>
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
                    <p class="label">Department</p>
                    <p class="value">{{ data_get($leave, 'department') ?? '—' }}</p>
                </td>
                <td>
                    <p class="label">Name of Applicant</p>
                    <p class="value">{{ data_get($leave, 'name') ?? '—' }}</p>
                </td>
                <td>
                    <p class="label">Position</p>
                    <p class="value">{{ data_get($leave, 'jobTitle') ?? '—' }}</p>
                </td>
            </tr>
            <tr>
                <td>
                    <p class="label">Leave Type</p>
                    <p class="value">{{ data_get($leave, 'leaveType') ? str_replace('_', ' ', ucwords((string) data_get($leave, 'leaveType'), '_')) : '—' }}</p>
                </td>
                <td>
                    <p class="label">Dates</p>
                    <p class="value">
                        {{ $formatDate(data_get($leave, 'startDate')) }} to {{ $formatDate(data_get($leave, 'endDate')) }}
                    </p>
                </td>
                <td>
                    <p class="label">Days Requested</p>
                    <p class="value">
                        {{ data_get($leave, 'daysRequested') !== null ? number_format((float) data_get($leave, 'daysRequested'), 0) : '—' }}
                    </p>
                </td>
            </tr>
        </table>

        <div class="section">
            <h2 class="section-title">Leave Application Details</h2>
            <table class="info-table">
                <tr>
                    <td style="width: 25%;">
                        <div class="label">Leave Type</div>
                        <div class="value-block">
                            {{ data_get($leave, 'leaveType') ? str_replace('_', ' ', ucwords((string) data_get($leave, 'leaveType'), '_')) : '—' }}
                        </div>
                    </td>
                    <td style="width: 25%;">
                        <div class="label">Date From</div>
                        <div class="value-block">{{ $formatDate(data_get($leave, 'startDate')) }}</div>
                    </td>
                    <td style="width: 25%;">
                        <div class="label">Date To</div>
                        <div class="value-block">{{ $formatDate(data_get($leave, 'endDate')) }}</div>
                    </td>
                    <td style="width: 25%;">
                        <div class="label">Days Requested</div>
                        <div class="value-block">
                            {{ $daysRequested !== null ? number_format((float) $daysRequested, 0).' day(s)' : '—' }}
                        </div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="label">Leave Credits / Accrual</div>
                        <div class="value-block">{{ $leaveAccrualComputation }}</div>
                    </td>
                    <td>
                        <div class="label">Department Head Decision</div>
                        <div class="value-block">{{ $decisionLabel($dhDecision) }}</div>
                    </td>
                    <td>
                        <div class="label">HR Decision</div>
                        <div class="value-block">{{ $decisionLabel($hrDecision) }}</div>
                    </td>
                    <td>
                        <div class="label">Created At</div>
                        <div class="value-block">{{ $formatTimestamp(data_get($leave, 'createdAt')) }}</div>
                    </td>
                </tr>
            </table>
        </div>

        <div class="section">
            <h2 class="section-title">Reason for Leave</h2>
            <div class="reason-box">
                <p class="reason-text">{{ data_get($leave, 'reason') ?: '—' }}</p>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Review Outcome</h2>
            <table class="decision-table">
                <tr>
                    <td>
                        <p class="label">Final Status</p>
                        <p class="value">{{ $status }}</p>
                    </td>
                    <td>
                        <p class="label">Stage</p>
                        <p class="value">{{ data_get($leave, 'stage') ? str_replace('_', ' ', ucwords((string) data_get($leave, 'stage'), '_')) : '—' }}</p>
                    </td>
                    <td>
                        <p class="label">Rejection Reason</p>
                        <p class="small">{{ $status === 'Rejected' ? (data_get($leave, 'rejectionReasonText') ?: '—') : '—' }}</p>
                    </td>
                </tr>
            </table>
        </div>

        <div class="section">
            <h2 class="section-title">Workflow Sign-Off</h2>
            <table class="sign-off-table">
                <tr>
                    <td>
                        <div class="label">Evaluator</div>
                        <div class="sign-name">{{ data_get($leave, 'workflowSignOff.evaluatorName') ?? '—' }}</div>
                        <div class="sign-date">{{ $formatTimestamp(data_get($leave, 'workflowSignOff.evaluatorDate')) }}</div>
                    </td>
                    <td>
                        <div class="label">HR Personnel</div>
                        <div class="sign-name">{{ data_get($leave, 'workflowSignOff.hrPersonnelName') ?? '—' }}</div>
                        <div class="sign-date">{{ $formatTimestamp(data_get($leave, 'workflowSignOff.hrPersonnelDate')) }}</div>
                    </td>
                    <td>
                        <div class="label">PMT</div>
                        <div class="sign-name">{{ data_get($leave, 'workflowSignOff.pmtName') ?? 'Not applicable' }}</div>
                        <div class="sign-date">{{ $formatTimestamp(data_get($leave, 'workflowSignOff.pmtDate')) }}</div>
                    </td>
                </tr>
            </table>
        </div>

        <div class="section">
            <h2 class="section-title">Supporting Documents</h2>
            @if (collect($supportingDocuments)->contains(fn ($document) => data_get($document, 'available')))
                <table class="documents-table">
                    <thead>
                        <tr>
                            <th style="width: 34%;">Document</th>
                            <th style="width: 66%;">Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($supportingDocuments as $document)
                            @if (data_get($document, 'available'))
                                <tr>
                                    <td>{{ data_get($document, 'label') }}</td>
                                    <td class="small">Attached to the leave request and available through the application record.</td>
                                </tr>
                            @endif
                        @endforeach
                    </tbody>
                </table>
            @else
                <p class="small">No supporting document is attached to this leave request.</p>
            @endif
        </div>
    </div>
</body>
</html>
