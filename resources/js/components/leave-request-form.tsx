import { useForm } from '@inertiajs/react';
import { addDays, addMonths, differenceInCalendarDays, format, startOfDay } from 'date-fns';
import { CalendarDays, FileCheck2, ShieldCheck, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

type LeaveOption = {
    value: string;
    label: string;
    category: 'Vacation Leave' | 'Sick Leave' | 'Special Leave';
};

const leaveOptions: LeaveOption[] = [
    { value: 'vacation-leave', label: 'Vacation Leave', category: 'Vacation Leave' },
    { value: 'force-leave', label: 'Force Leave', category: 'Vacation Leave' },
    { value: 'special-privilege-leave', label: 'Special Privilege Leave', category: 'Vacation Leave' },
    { value: 'wellness-leave', label: 'Wellness Leave', category: 'Vacation Leave' },
    { value: 'sick-leave', label: 'Sick Leave', category: 'Sick Leave' },
    { value: 'special-sick-leave-women', label: 'Special Sick Leave (Women)', category: 'Sick Leave' },
    { value: 'maternity-leave', label: 'Maternity Leave', category: 'Special Leave' },
    { value: 'paternity-leave', label: 'Paternity Leave', category: 'Special Leave' },
    { value: 'solo-parent-leave', label: 'Solo Parent Leave', category: 'Special Leave' },
];

const groupedLeaveOptions = {
    'Vacation Leave': leaveOptions.filter((option) => option.category === 'Vacation Leave'),
    'Sick Leave': leaveOptions.filter((option) => option.category === 'Sick Leave'),
    'Special Leave': leaveOptions.filter((option) => option.category === 'Special Leave'),
};

const defaultRequirements = [
    'Approval hierarchy: Department Head -> HR Personnel.',
    'Submit accurate dates and complete supporting details.',
];

const leaveRequirements: Record<string, string[]> = {
    'vacation-leave': [
        'Maximum credit per year: 15 days (1.25 days earned monthly).',
        'Submit at least 5 days before intended leave date.',
    ],
    'force-leave': [
        'Maximum of 5 days.',
        'Mandatory and deducted from remaining vacation leave credits at year-end.',
    ],
    'special-privilege-leave': [
        'Maximum of 3 days.',
        'Not deducted from remaining vacation leave credits at year-end.',
    ],
    'wellness-leave': [
        'Maximum of 5 days.',
        'Not deducted from remaining vacation leave credits at year-end.',
    ],
    'sick-leave': [
        'Maximum credit per year: 15 days.',
        'Less than 4 days: leave application form only.',
        'More than 6 days: leave application form + medical certificate.',
    ],
    'special-sick-leave-women': [
        'For qualifying cases (e.g., diagnosed breast cancer).',
        'Maximum of 3 months.',
        'Not deducted from remaining vacation leave credits at year-end.',
    ],
    'maternity-leave': [
        'Submit 1 month before expected delivery date.',
        'Required document: Marriage Certificate.',
    ],
    'paternity-leave': [
        'Submit 1 month before or after expected delivery date.',
        'Required document: Marriage Certificate.',
    ],
    'solo-parent-leave': [
        'Maximum of 7 days per year.',
        'Required document: Solo Parent ID.',
    ],
};

function resolveMaximumEndDate(start: Date | undefined, leaveType: string): Date | undefined {
    if (!start) {
        return undefined;
    }

    const maxDaysByLeaveType: Record<string, number> = {
        'force-leave': 5,
        'special-privilege-leave': 3,
        'wellness-leave': 5,
        'solo-parent-leave': 7,
    };

    const maxDays = maxDaysByLeaveType[leaveType];

    if (typeof maxDays === 'number') {
        return addDays(start, maxDays - 1);
    }

    if (leaveType === 'special-sick-leave-women') {
        return addMonths(start, 3);
    }

    return undefined;
}

export default function LeaveRequestForm() {
    const [selectedLeaveType, setSelectedLeaveType] = useState('force-leave');
    const [startDate, setStartDate] = useState<Date>();
    const [endDate, setEndDate] = useState<Date>();
    const { data, setData, post, processing, errors, reset } = useForm<{
        leaveType: string;
        startDate: string;
        endDate: string;
        reason: string;
        medicalCertificate: File | null;
        marriageCertificate: File | null;
        soloParentId: File | null;
    }>({
        leaveType: 'force-leave',
        startDate: '',
        endDate: '',
        reason: '',
        medicalCertificate: null,
        marriageCertificate: null,
        soloParentId: null,
    });

    const selectedLeaveRequirements = useMemo(() => {
        if (selectedLeaveType.length === 0) {
            return defaultRequirements;
        }

        return leaveRequirements[selectedLeaveType] ?? defaultRequirements;
    }, [selectedLeaveType]);

    const maxDaysByLeaveType: Record<string, number> = {
        'force-leave': 5,
        'special-privilege-leave': 3,
        'wellness-leave': 5,
        'solo-parent-leave': 7,
    };

    const maxDays = maxDaysByLeaveType[selectedLeaveType];
    const maxMonths = selectedLeaveType === 'special-sick-leave-women' ? 3 : undefined;

    const maximumEndDate = useMemo(() => {
        return resolveMaximumEndDate(startDate, selectedLeaveType);
    }, [selectedLeaveType, startDate]);

    const totalLeaveDays = useMemo(() => {
        if (!startDate || !endDate) {
            return null;
        }

        return differenceInCalendarDays(endDate, startDate) + 1;
    }, [endDate, startDate]);

    const exceedsConfiguredLimit = useMemo(() => {
        if (totalLeaveDays === null || !startDate || !endDate) {
            return false;
        }

        if (typeof maxDays === 'number') {
            return totalLeaveDays > maxDays;
        }

        if (maximumEndDate) {
            return endDate > maximumEndDate;
        }

        return false;
    }, [endDate, maxDays, maximumEndDate, startDate, totalLeaveDays]);

    const shouldUploadMedicalCertificate = selectedLeaveType === 'sick-leave' && (totalLeaveDays ?? 0) > 6;
    const shouldUploadMarriageCertificate = selectedLeaveType === 'paternity-leave' || selectedLeaveType === 'maternity-leave';
    const shouldUploadSoloParentId = selectedLeaveType === 'solo-parent-leave';
    const shouldShowSupportingDocuments =
        shouldUploadMedicalCertificate || shouldUploadMarriageCertificate || shouldUploadSoloParentId;

    const dateNoticeMessage = useMemo(() => {
        if (!startDate) {
            return undefined;
        }

        const today = startOfDay(new Date());
        const leadTimeDays = differenceInCalendarDays(startDate, today);

        if (leadTimeDays < 0) {
            return 'Start date cannot be in the past.';
        }

        const vacationNoticeTypes = new Set([
            'vacation-leave',
            'force-leave',
            'special-privilege-leave',
            'wellness-leave',
        ]);

        if (vacationNoticeTypes.has(selectedLeaveType) && leadTimeDays < 5) {
            return 'Application must be submitted 5 days before intended leave.';
        }

        if (selectedLeaveType === 'maternity-leave' && leadTimeDays < 30) {
            return 'Maternity leave must be submitted 1 month before expected delivery.';
        }

        if (selectedLeaveType === 'paternity-leave' && leadTimeDays < 30) {
            return 'Paternity leave must be submitted 1 month before expected delivery.';
        }

        return undefined;
    }, [selectedLeaveType, startDate]);

    const dateValidationMessage = useMemo(() => {
        if (!startDate || !endDate || !exceedsConfiguredLimit) {
            return undefined;
        }

        if (typeof maxDays === 'number') {
            return `Selected leave exceeds the ${maxDays}-day limit for this leave type.`;
        }

        if (typeof maxMonths === 'number') {
            return `Selected leave exceeds the ${maxMonths}-month limit for this leave type.`;
        }

        return undefined;
    }, [endDate, exceedsConfiguredLimit, maxDays, maxMonths, startDate]);

    const handleLeaveTypeChange = (value: string): void => {
        setSelectedLeaveType(value);
        setData('leaveType', value);
        setData('medicalCertificate', null);
        setData('marriageCertificate', null);
        setData('soloParentId', null);

        if (!startDate || !endDate) {
            return;
        }

        const nextMaximumEndDate = resolveMaximumEndDate(startDate, value);
        if (endDate < startDate || (nextMaximumEndDate && endDate > nextMaximumEndDate)) {
            setEndDate(undefined);
            setData('endDate', '');
        }
    };

    const handleStartDateChange = (date: Date | undefined): void => {
        setStartDate(date);
        setData('startDate', date ? format(date, 'yyyy-MM-dd') : '');

        if (!date) {
            setEndDate(undefined);
            setData('endDate', '');
            return;
        }

        if (!endDate) {
            return;
        }

        const nextMaximumEndDate = resolveMaximumEndDate(date, selectedLeaveType);
        if (endDate < date || (nextMaximumEndDate && endDate > nextMaximumEndDate)) {
            setEndDate(undefined);
            setData('endDate', '');
        }
    };

    const handleEndDateChange = (date: Date | undefined): void => {
        if (!date) {
            setEndDate(undefined);
            setData('endDate', '');
            return;
        }

        if (!startDate) {
            setEndDate(date);
            return;
        }

        const nextMaximumEndDate = resolveMaximumEndDate(startDate, selectedLeaveType);
        if (date < startDate || (nextMaximumEndDate && date > nextMaximumEndDate)) {
            return;
        }

        setEndDate(date);
        setData('endDate', format(date, 'yyyy-MM-dd'));
    };

    const handleSubmit = (): void => {
        post('/leave-application', {
            forceFormData: true,
            onSuccess: () => {
                handleReset();
            },
        });
    };

    const handleReset = (): void => {
        reset();
        setSelectedLeaveType('force-leave');
        setStartDate(undefined);
        setEndDate(undefined);
    };

    return (
        <div>
            <Card className="glass-card animate-fade-in-up border-primary/20 bg-card shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="space-y-3">
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Approval Hierarchy
                    </CardTitle>
                    <CardDescription className="text-sm">Department Head {'>'} HR Personnel</CardDescription>
                </CardHeader>
                <CardContent>
                        <div className="rounded-lg border border-border bg-background/70 p-4">
                            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                                <FileCheck2 className="h-4 w-4 text-primary" />
                                Leave Policy Notes
                            </h2>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                                {selectedLeaveRequirements.map((requirement) => (
                                    <li key={requirement}>- {requirement}</li>
                                ))}
                            </ul>
                        </div>
                    <Separator className='my-6'/>
                    <form className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="flex flex-col gap-2 md:col-span-2">
                                <Label htmlFor="leaveType">Leave Type</Label>
                                <Select value={selectedLeaveType} onValueChange={handleLeaveTypeChange}>
                                    <SelectTrigger id="leaveType" className="w-full bg-card">
                                        <SelectValue placeholder="Select leave type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Vacation Leave</div>
                                        {groupedLeaveOptions['Vacation Leave'].map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}

                                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Sick Leave</div>
                                        {groupedLeaveOptions['Sick Leave'].map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}

                                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Special Leave</div>
                                        {groupedLeaveOptions['Special Leave'].map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.leaveType} />
                            </div>

                            <div className="flex min-w-0 flex-col gap-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <DatePicker
                                    value={startDate}
                                    onChange={handleStartDateChange}
                                    placeholder="Select start date"
                                />
                                <InputError message={dateNoticeMessage ?? errors.startDate} />
                            </div>
                            <div className="flex min-w-0 flex-col gap-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <DatePicker
                                    value={endDate}
                                    onChange={handleEndDateChange}
                                    fromDate={startDate}
                                    toDate={maximumEndDate}
                                    placeholder="Select end date"
                                />
                                <InputError message={dateValidationMessage ?? errors.endDate} />
                            </div>

                            <div className="flex flex-col gap-2 md:col-span-2">
                                <Label htmlFor="reason">Reason / Remarks</Label>
                                <Textarea
                                    id="reason"
                                    name="reason"
                                    value={data.reason}
                                    onChange={(event) => {
                                        setData('reason', event.target.value);
                                    }}
                                    className="min-h-32 w-full resize-none"
                                    placeholder="Provide complete details for your request."
                                />
                                <InputError message={errors.reason} />
                            </div>

                            {shouldShowSupportingDocuments && (
                                <div className="rounded-lg border border-border bg-background/70 p-4 md:col-span-2">
                                    <h2 className="mb-3 text-sm font-semibold text-foreground">Required Supporting Documents</h2>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        {shouldUploadMedicalCertificate && (
                                            <div className="flex flex-col gap-2">
                                                <Label htmlFor="medicalCertificate" className="flex items-center gap-2">
                                                    <Upload className="h-4 w-4 text-primary" />
                                                    Medical Certificate
                                                </Label>
                                                <Input
                                                    id="medicalCertificate"
                                                    name="medicalCertificate"
                                                    type="file"
                                                    required
                                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                    onChange={(event) => {
                                                        setData('medicalCertificate', event.target.files?.[0] ?? null);
                                                    }}
                                                />
                                                <InputError message={errors.medicalCertificate} />
                                            </div>
                                        )}
                                        {shouldUploadMarriageCertificate && (
                                            <div className="flex flex-col gap-2">
                                                <Label htmlFor="marriageCertificate" className="flex items-center gap-2">
                                                    <Upload className="h-4 w-4 text-primary" />
                                                    Marriage Certificate
                                                </Label>
                                                <Input
                                                    id="marriageCertificate"
                                                    name="marriageCertificate"
                                                    type="file"
                                                    required
                                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                    onChange={(event) => {
                                                        setData('marriageCertificate', event.target.files?.[0] ?? null);
                                                    }}
                                                />
                                                <InputError message={errors.marriageCertificate} />
                                            </div>
                                        )}
                                        {shouldUploadSoloParentId && (
                                            <div className="flex flex-col gap-2">
                                                <Label htmlFor="soloParentId" className="flex items-center gap-2">
                                                    <Upload className="h-4 w-4 text-primary" />
                                                    Solo Parent ID
                                                </Label>
                                                <Input
                                                    id="soloParentId"
                                                    name="soloParentId"
                                                    type="file"
                                                    required
                                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                    onChange={(event) => {
                                                        setData('soloParentId', event.target.files?.[0] ?? null);
                                                    }}
                                                />
                                                <InputError message={errors.soloParentId} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                            <Button type="button" variant="destructive" className="w-full" onClick={handleReset}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="default"
                                className="w-full"
                                disabled={Boolean(dateValidationMessage || dateNoticeMessage || processing)}
                                onClick={handleSubmit}
                            >
                                {processing ? "Submitting..." : "Submit Request"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
