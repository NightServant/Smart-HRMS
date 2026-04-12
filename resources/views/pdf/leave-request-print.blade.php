@php
    $leave = $leaveRequest;
    $leaveType   = (string) data_get($leave, 'leaveType', '');
    $daysFiled   = (float)  data_get($leave, 'daysRequested', 0);
    $dhDecision  = (int)    data_get($leave, 'dhDecision', 0);
    $hrDecision  = (int)    data_get($leave, 'hrDecision', 0);
    $vlCredits   = (float)  data_get($leave, 'vlCredits', 0.0);
    $slCredits   = (float)  data_get($leave, 'slCredits', 0.0);
    $reason      = (string) data_get($leave, 'reason', '');
    $rejection   = (string) data_get($leave, 'rejectionReasonText', '');
    $dhName      = (string) data_get($leave, 'workflowSignOff.evaluatorName', '');
    $hrName      = (string) data_get($leave, 'workflowSignOff.hrPersonnelName', '');
    $employeeName = (string) data_get($leave, 'name', '');
    $department  = (string) data_get($leave, 'department', '');
    $position    = (string) data_get($leave, 'jobTitle', '');

    // Checkbox helper
    $chk = fn(bool $on): string => $on ? '&#9745;' : '&#9744;';
    $is  = fn(string $type): bool => $leaveType === $type;

    // VL/SL credit computation
    // vlCredits / slCredits = remaining balance BEFORE this application (only completed leaves are deducted in the controller)
    $vlLeaveTypes = ['vacation_leave', 'force_leave'];
    $slLeaveTypes = ['sick_leave', 'special_sick_leave_for_women', 'special_sick_leave_women', 'wellness_leave'];
    $isVl = in_array($leaveType, $vlLeaveTypes);
    $isSl = in_array($leaveType, $slLeaveTypes);

    $vlEarned = $isVl ? number_format($vlCredits + $daysFiled, 3) : '';
    $vlLess   = $isVl ? number_format($daysFiled, 3)             : '';
    $vlBal    = $isVl ? number_format(max(0.0, $vlCredits), 3)   : '';
    $slEarned = $isSl ? number_format($slCredits + $daysFiled, 3) : '';
    $slLess   = $isSl ? number_format($daysFiled, 3)              : '';
    $slBal    = $isSl ? number_format(max(0.0, $slCredits), 3)    : '';

    // Date helpers
    $fmtDate = fn (?string $d): string => $d ? \Carbon\Carbon::parse($d)->format('m/d/Y') : '';
    $startDate = $fmtDate(data_get($leave, 'startDate'));
    $endDate   = $fmtDate(data_get($leave, 'endDate'));
    $today     = now()->format('m/d/Y');

    $createdAt = data_get($leave, 'createdAt', '');
    try {
        $filedDate = $createdAt ? \Carbon\Carbon::parse($createdAt)->format('m/d/Y') : '';
    } catch (\Exception $e) {
        $filedDate = '';
    }

    // 6.B conditions
    $isVacOrSpl   = in_array($leaveType, ['vacation_leave', 'special_privilege_leave']);
    $isSickLeave  = ($leaveType === 'sick_leave');
    $isWomenLeave = in_array($leaveType, ['special_sick_leave_for_women', 'special_sick_leave_women']);
    $isStudyLeave = ($leaveType === 'study_leave');
@endphp
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Application for Leave</title>
    <style>
        @page { size: letter portrait; margin: 10mm 12mm; }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: 'DejaVu Sans', sans-serif;
            font-size: 8px;
            color: #000;
            background: #fff;
        }
        table { border-collapse: collapse; width: 100%; }
        td, th { vertical-align: top; }

        /* Outer form border */
        .form-wrap { border: 1.5px solid #000; }

        /* Generic bordered cell */
        .c  { border: 1px solid #000; padding: 3px 5px; }
        .ct { border-top: 1px solid #000; }
        .cb { border-bottom: 1px solid #000; }
        .cl { border-left: 1px solid #000; }
        .cr { border-right: 1px solid #000; }

        /* Section header bar */
        .sec-hdr {
            background: #595959;
            color: #fff;
            font-weight: bold;
            font-size: 8px;
            padding: 2px 6px;
        }

        /* Field label (tiny caps above field value) */
        .field-lbl {
            font-size: 6.5px;
            font-style: italic;
            display: block;
            margin-bottom: 1px;
        }

        /* Underline field */
        .uline {
            border-bottom: 0.5px solid #000;
            min-height: 11px;
            display: block;
            font-size: 8.5px;
            padding-bottom: 1px;
        }

        /* Signature underline (wider bottom) */
        .sig-line {
            border-bottom: 1px solid #000;
            min-height: 20px;
            display: block;
            font-size: 8px;
            text-align: center;
            padding-bottom: 2px;
            margin-top: 18px;
        }

        /* Signature caption */
        .sig-cap {
            font-size: 6.5px;
            text-align: center;
            display: block;
            border-top: 0.5px solid #000;
            padding-top: 1px;
        }

        .bold { font-weight: bold; }
        .center { text-align: center; }
        .right { text-align: right; }
        .italic { font-style: italic; }
        .xs { font-size: 6.5px; }
        .sm { font-size: 7.5px; }
        .lg { font-size: 10px; }

        .chk-row { margin-bottom: 2px; }
    </style>
</head>
<body>

{{-- ===================================================================
     FORM HEADER
==================================================================== --}}
<table>
    <tr>
        <td style="width:30%; padding:0 0 2px 0;">
            <span style="font-size:7px; font-style:italic;">CS Form No. 6 (Revised 2020)</span>
        </td>
        <td style="width:40%; padding:0 0 2px 0; text-align:center;">
            <span style="font-size:11px; font-weight:bold;">APPLICATION FOR LEAVE</span>
        </td>
        <td style="width:30%; padding:0 0 2px 0; text-align:right;">
            <span style="font-size:7px; font-weight:bold; font-style:italic;">ANNEX A</span>
        </td>
    </tr>
</table>

{{-- ===================================================================
     EMPLOYEE INFORMATION
==================================================================== --}}
<div class="form-wrap">

<table>
    <tr>
        <td class="c" style="width:55%;">
            <span class="field-lbl">1. OFFICE/DEPARTMENT</span>
            <span class="uline">{{ $department }}</span>
        </td>
        <td class="c" style="width:20%;">
            <span class="field-lbl">2. DATE OF FILING</span>
            <span class="uline">{{ $filedDate }}</span>
        </td>
        <td class="c" style="width:25%;">
            <span class="field-lbl">3. SALARY</span>
            <span class="uline">&nbsp;</span>
        </td>
    </tr>
    <tr>
        <td class="c" colspan="2">
            <span class="field-lbl">4. NAME (Last, First, Middle)</span>
            <span class="uline">{{ $employeeName }}</span>
        </td>
        <td class="c">
            <span class="field-lbl">5. POSITION/TITLE</span>
            <span class="uline">{{ $position }}</span>
        </td>
    </tr>
</table>

{{-- ===================================================================
     SECTION 6 — DETAILS OF APPLICATION
==================================================================== --}}
<table>
    <tr>
        <td class="sec-hdr" colspan="2">6.&nbsp;&nbsp;DETAILS OF APPLICATION</td>
    </tr>
</table>

<table>
    {{-- 6.A | 6.B --}}
    <tr>
        {{-- 6.A: Type of Leave --}}
        <td class="c" style="width:40%; vertical-align:top;">
            <div class="bold xs" style="margin-bottom:3px;">6.A TYPE OF LEAVE TO BE AVAILED OF</div>

            <div class="chk-row">{!! $chk($is('vacation_leave')) !!} <span class="sm">Vacation Leave</span></div>
            <div class="chk-row">{!! $chk($is('force_leave')) !!} <span class="sm">Mandatory/Forced Leave</span></div>
            <div class="chk-row">{!! $chk($is('sick_leave')) !!} <span class="sm">Sick Leave</span></div>
            <div class="chk-row">{!! $chk($is('maternity_leave')) !!} <span class="sm">Maternity Leave</span></div>
            <div class="chk-row">{!! $chk($is('paternity_leave')) !!} <span class="sm">Paternity Leave</span></div>
            <div class="chk-row">{!! $chk($is('special_privilege_leave')) !!} <span class="sm">Special Privilege Leave</span></div>
            <div class="chk-row">{!! $chk($is('solo_parent_leave')) !!} <span class="sm">Solo Parent Leave</span></div>
            <div class="chk-row">{!! $chk($is('study_leave')) !!} <span class="sm">Study Leave</span></div>
            <div class="chk-row">{!! $chk($is('10_day_vawc_leave')) !!} <span class="sm">10-Day VAWC Leave</span></div>
            <div class="chk-row">{!! $chk($is('rehabilitation_privilege')) !!} <span class="sm">Rehabilitation Privilege</span></div>
            <div class="chk-row">{!! $chk(in_array($leaveType, ['special_sick_leave_for_women','special_sick_leave_women'])) !!} <span class="sm">Special Leave Benefit for Women</span></div>
            <div class="chk-row">{!! $chk($is('special_emergency_leave')) !!} <span class="sm">Special Emergency (Calamity) Leave</span></div>
            <div class="chk-row">{!! $chk($is('adoption_leave')) !!} <span class="sm">Adoption Leave</span></div>
            <div class="chk-row">{!! $chk($is('wellness_leave')) !!} <span class="sm">Wellness Leave</span></div>
        </td>

        {{-- 6.B: Specific details --}}
        <td class="c" style="width:60%; vertical-align:top;">
            <div class="bold xs" style="margin-bottom:3px;">6.B DETAILS OF LEAVE</div>

            {{-- Vacation / Special Privilege --}}
            <div style="margin-bottom:4px;">
                <div class="xs italic" style="margin-bottom:2px;">In case of Vacation/Special Privilege Leave:</div>
                <div class="chk-row">
                    {!! $chk($isVacOrSpl) !!}
                    <span class="xs">Within the Philippines (specify):</span>
                    <span class="uline" style="display:inline-block; min-width:150px; border-bottom:0.5px solid #000;">{{ $isVacOrSpl ? $reason : '' }}</span>
                </div>
                <div class="chk-row">
                    {!! $chk(false) !!}
                    <span class="xs">Abroad (specify):</span>
                    <span class="uline" style="display:inline-block; min-width:180px; border-bottom:0.5px solid #000;">&nbsp;</span>
                </div>
            </div>

            {{-- Sick Leave --}}
            <div style="margin-bottom:4px;">
                <div class="xs italic" style="margin-bottom:2px;">In case of Sick Leave:</div>
                <div class="chk-row">
                    {!! $chk($isSickLeave) !!}
                    <span class="xs">In Hospital (specify illness):</span>
                    <span class="uline" style="display:inline-block; min-width:130px; border-bottom:0.5px solid #000;">{{ $isSickLeave ? $reason : '' }}</span>
                </div>
                <div class="chk-row">
                    {!! $chk(false) !!}
                    <span class="xs">Out Patient (specify illness):</span>
                    <span class="uline" style="display:inline-block; min-width:125px; border-bottom:0.5px solid #000;">&nbsp;</span>
                </div>
            </div>

            {{-- Special Leave Benefit for Women --}}
            <div style="margin-bottom:4px;">
                <div class="xs italic" style="margin-bottom:2px;">In case of Special Leave Benefits for Women:</div>
                <div class="xs" style="margin-bottom:1px;">(Specify illness/surgery):</div>
                <span class="uline" style="display:block; border-bottom:0.5px solid #000; min-height:11px;">{{ $isWomenLeave ? $reason : '' }}</span>
            </div>

            {{-- Study Leave --}}
            <div>
                <div class="xs italic" style="margin-bottom:2px;">In case of Study Leave:</div>
                <div class="chk-row">
                    {!! $chk($isStudyLeave) !!}
                    <span class="xs">Completion of Master&#39;s Degree</span>
                </div>
                <div class="chk-row">
                    {!! $chk(false) !!}
                    <span class="xs">BAR/Board Exam Review</span>
                </div>
            </div>
        </td>
    </tr>

    {{-- 6.C: Working days + inclusive dates --}}
    <tr>
        <td class="c" colspan="2">
            <table>
                <tr>
                    <td style="padding:0; width:50%;">
                        <span class="bold xs">6.C NUMBER OF WORKING DAYS APPLIED FOR</span><br>
                        <span class="uline" style="display:inline-block; width:80px; border-bottom:0.5px solid #000; font-size:9px; font-weight:bold;">{{ $daysFiled > 0 ? number_format($daysFiled, 0) : '' }}</span>
                        <span class="xs"> day(s)</span>
                    </td>
                    <td style="padding:0; width:50%;">
                        <span class="bold xs">INCLUSIVE DATES</span><br>
                        <span class="xs">From: </span>
                        <span class="uline" style="display:inline-block; width:65px; border-bottom:0.5px solid #000; font-size:8.5px;">{{ $startDate }}</span>
                        <span class="xs"> &nbsp;To: </span>
                        <span class="uline" style="display:inline-block; width:65px; border-bottom:0.5px solid #000; font-size:8.5px;">{{ $endDate }}</span>
                    </td>
                </tr>
            </table>
        </td>
    </tr>

    {{-- 6.D: Commutation + Signature --}}
    <tr>
        <td class="c" style="width:50%;">
            <span class="bold xs">6.D COMMUTATION OF LEAVE CREDITS</span><br>
            <span style="margin-right:12px;">{!! $chk(true) !!} <span class="xs">Not Requested</span></span>
            <span>{!! $chk(false) !!} <span class="xs">Requested</span></span>
        </td>
        <td class="c" style="width:50%; text-align:center;">
            <span class="sig-line">{{ $employeeName }}</span>
            <span class="sig-cap">Signature of Applicant</span>
        </td>
    </tr>
</table>

{{-- ===================================================================
     SECTION 7 — DETAILS OF ACTION ON APPLICATION
==================================================================== --}}
<table>
    <tr>
        <td class="sec-hdr" colspan="3">7.&nbsp;&nbsp;DETAILS OF ACTION ON APPLICATION</td>
    </tr>
</table>

<table>
    <tr>
        {{-- 7.A: Leave Credits Certification --}}
        <td class="c" style="width:35%; vertical-align:top;">
            <div class="bold xs" style="margin-bottom:3px;">7.A CERTIFICATION OF LEAVE CREDITS</div>
            <div class="xs" style="margin-bottom:3px;">As of: <span style="border-bottom:0.5px solid #000; display:inline-block; min-width:55px;">{{ $today }}</span></div>

            <table style="width:100%; font-size:7px; margin-bottom:4px;">
                <tr>
                    <td class="c" style="width:40%;">&nbsp;</td>
                    <td class="c" style="width:30%; text-align:center;"><span class="bold">Vacation<br>Leave</span></td>
                    <td class="c" style="width:30%; text-align:center;"><span class="bold">Sick<br>Leave</span></td>
                </tr>
                <tr>
                    <td class="c"><span class="italic">Total Earned</span></td>
                    <td class="c" style="text-align:center;">{{ $vlEarned }}</td>
                    <td class="c" style="text-align:center;">{{ $slEarned }}</td>
                </tr>
                <tr>
                    <td class="c"><span class="italic">Less this application</span></td>
                    <td class="c" style="text-align:center;">{{ $vlLess }}</td>
                    <td class="c" style="text-align:center;">{{ $slLess }}</td>
                </tr>
                <tr>
                    <td class="c"><span class="italic">Balance</span></td>
                    <td class="c" style="text-align:center;">{{ $vlBal }}</td>
                    <td class="c" style="text-align:center;">{{ $slBal }}</td>
                </tr>
            </table>

            <span class="sig-line">{{ $hrName }}</span>
            <span class="sig-cap">Authorized Officer</span>
        </td>

        {{-- 7.B: DH Recommendation --}}
        <td class="c" style="width:32%; vertical-align:top;">
            <div class="bold xs" style="margin-bottom:3px;">7.B RECOMMENDATION</div>
            <div class="chk-row" style="margin-bottom:4px;">
                {!! $chk($dhDecision === 1) !!} <span class="xs">For approval</span>
            </div>
            <div class="chk-row">
                {!! $chk($dhDecision === 2) !!} <span class="xs">For disapproval due to:</span>
            </div>
            @if ($dhDecision === 2 && $rejection)
                <div class="xs" style="margin-top:2px; border:0.5px solid #999; padding:2px 3px;">{{ $rejection }}</div>
            @else
                <span class="uline" style="display:block; border-bottom:0.5px solid #000; margin-top:2px;">&nbsp;</span>
                <span class="uline" style="display:block; border-bottom:0.5px solid #000; margin-top:2px;">&nbsp;</span>
            @endif

            <span class="sig-line">{{ $dhName }}</span>
            <span class="sig-cap">Immediate Supervisor / Head of Agency</span>
        </td>

        {{-- 7.C: Agency Head Approval --}}
        <td class="c" style="width:33%; vertical-align:top;">
            <div class="bold xs" style="margin-bottom:3px;">7.C APPROVED FOR:</div>
            <table style="width:100%; margin-bottom:3px;">
                <tr>
                    <td style="padding:0 2px 0 0; width:50%;">
                        <span class="uline" style="display:inline-block; width:30px; border-bottom:0.5px solid #000; font-weight:bold;">
                            @if ($hrDecision === 1){{ number_format($daysFiled, 0) }}@endif
                        </span>
                        <span class="xs"> days with pay</span>
                    </td>
                    <td style="padding:0; width:50%;">
                        <span class="uline" style="display:inline-block; width:30px; border-bottom:0.5px solid #000;">&nbsp;</span>
                        <span class="xs"> days without pay</span>
                    </td>
                </tr>
            </table>
            <div class="xs" style="margin-bottom:2px;">DISAPPROVED DUE TO:</div>
            @if ($hrDecision === 2 && $rejection)
                <div class="xs" style="margin-bottom:3px; border:0.5px solid #999; padding:2px 3px;">{{ $rejection }}</div>
            @else
                <span class="uline" style="display:block; border-bottom:0.5px solid #000; margin-bottom:2px;">&nbsp;</span>
                <span class="uline" style="display:block; border-bottom:0.5px solid #000; margin-bottom:2px;">&nbsp;</span>
            @endif

            <span class="sig-line">{{ $hrName }}</span>
            <span class="sig-cap">Agency Head / Authorized Official</span>
        </td>
    </tr>

    {{-- 7.D: Date of Return / Date Received --}}
    <tr>
        <td class="c" colspan="2">
            <span class="bold xs">7.D DATE OF RETURN FROM LEAVE:</span>
            <span class="uline" style="display:inline-block; min-width:90px; border-bottom:0.5px solid #000;">&nbsp;</span>
        </td>
        <td class="c">
            <span class="xs">Date Received: </span>
            <span class="uline" style="display:inline-block; min-width:80px; border-bottom:0.5px solid #000;">{{ $filedDate }}</span>
        </td>
    </tr>
</table>

</div>{{-- .form-wrap --}}

</body>
</html>
