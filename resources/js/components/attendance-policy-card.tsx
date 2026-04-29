import { useForm } from '@inertiajs/react';
import { Clock } from 'lucide-react';
import { type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type AttendancePolicy = {
    office_hours_start: string;
    office_hours_end: string;
    late_threshold_minutes: number;
};

export function AttendancePolicyCard({ policy }: { policy: AttendancePolicy }) {
    const { data, setData, post, processing, errors, recentlySuccessful } =
        useForm({
            settings: [
                {
                    key: 'office_hours_start',
                    value: policy.office_hours_start,
                },
                {
                    key: 'office_hours_end',
                    value: policy.office_hours_end,
                },
                {
                    key: 'late_threshold_minutes',
                    value: String(policy.late_threshold_minutes),
                },
            ],
        });

    const setSetting = (key: string, value: string): void => {
        setData(
            'settings',
            data.settings.map((setting) =>
                setting.key === key ? { ...setting, value } : setting,
            ),
        );
    };

    const valueOf = (key: string): string =>
        data.settings.find((setting) => setting.key === key)?.value ?? '';

    const handleSubmit = (event: FormEvent): void => {
        event.preventDefault();
        post('/admin/system-settings', {
            preserveScroll: true,
        });
    };

    return (
        <Card className="glass-card">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Clock className="size-4 text-primary" />
                            Attendance Policy
                        </CardTitle>
                        <CardDescription>
                            Set the official work-day window. Late time-ins are
                            measured from the start time plus the threshold.
                        </CardDescription>
                    </div>
                    {recentlySuccessful && (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            Saved
                        </span>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <form
                    onSubmit={handleSubmit}
                    className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
                >
                    <div className="grid gap-1.5">
                        <Label htmlFor="policy-start">Office Hours Start</Label>
                        <Input
                            id="policy-start"
                            type="time"
                            value={valueOf('office_hours_start')}
                            onChange={(event) =>
                                setSetting(
                                    'office_hours_start',
                                    event.target.value,
                                )
                            }
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="policy-end">Office Hours End</Label>
                        <Input
                            id="policy-end"
                            type="time"
                            value={valueOf('office_hours_end')}
                            onChange={(event) =>
                                setSetting(
                                    'office_hours_end',
                                    event.target.value,
                                )
                            }
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="policy-late">
                            Late Threshold (min)
                        </Label>
                        <Input
                            id="policy-late"
                            type="number"
                            min={0}
                            max={120}
                            value={valueOf('late_threshold_minutes')}
                            onChange={(event) =>
                                setSetting(
                                    'late_threshold_minutes',
                                    event.target.value,
                                )
                            }
                        />
                    </div>
                    <Button
                        type="submit"
                        className="md:self-end"
                        disabled={processing}
                    >
                        {processing ? 'Saving...' : 'Save Policy'}
                    </Button>
                </form>
                {Object.keys(errors).length > 0 && (
                    <p className="mt-3 text-xs text-destructive">
                        Could not save the policy. Please check your inputs.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
