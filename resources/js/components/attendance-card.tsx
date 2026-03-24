import { useForm } from '@inertiajs/react';
import { Fingerprint, ShieldCheck, TimerReset, UserRoundCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

type AttendanceAction = 'clock-in' | 'clock-out';
type ScanState = 'idle' | 'scanning' | 'verified' | 'failed';

const scanMessages: Record<ScanState, string> = {
    idle: 'Ready to scan fingerprint.',
    scanning: 'Scanning fingerprint...',
    verified: 'Fingerprint verified.',
    failed: 'Fingerprint not recognized. Try again.',
};

export default function AttendanceCard() {
    const [scanState, setScanState] = useState<ScanState>('idle');
    const [scanScore, setScanScore] = useState<number | null>(null);
    const [capturedAt, setCapturedAt] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data, setData, errors, reset } = useForm<{
        action: AttendanceAction;
        remarks: string;
        fingerprintToken: string;
        capturedAt: string;
    }>({
        action: 'clock-in',
        remarks: '',
        fingerprintToken: '',
        capturedAt: '',
    });

    const canSubmit = useMemo(() => {
        return (
            data.fingerprintToken.trim().length > 0 && scanState === 'verified'
        );
    }, [data.fingerprintToken, scanState]);

    const handleFingerprintScan = (): void => {
        setScanState('scanning');
        setScanScore(null);

        window.setTimeout(() => {
            const score = Math.floor(Math.random() * 21) + 80;
            const passed = score >= 85;
            const timestamp = new Date().toISOString();

            setCapturedAt(timestamp);
            setData('capturedAt', timestamp);
            setScanScore(score);

            if (passed) {
                setScanState('verified');
                setData('fingerprintToken', `FP-${timestamp}`);
                return;
            }

            setScanState('failed');
            setData('fingerprintToken', '');
        }, 1200);
    };

    const handleReset = (): void => {
        reset();
        setScanState('idle');
        setScanScore(null);
        setCapturedAt('');
    };

    const handleSubmit = (): void => {
        if (!canSubmit) {
            return;
        }

        setIsSubmitting(true);

        window.setTimeout(() => {
            setIsSubmitting(false);
            handleReset();
        }, 800);
    };

    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <div className="animate-fade-in-down">
                    <h1 className="flex items-center gap-2 text-3xl font-bold">
                        <Fingerprint className="h-8 w-8" />
                        Fingerprint Attendance
                    </h1>
                    <p className="mt-1 text-muted-foreground">Capture fingerprint then record clock-in or clock-out attendance.</p>
                </div>
            </div>

            <Card className="animate-fade-in-up border-primary/20 bg-card shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="space-y-3">
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Attendance Verification
                    </CardTitle>
                    <CardDescription className="text-sm">Employee {'>'} Fingerprint Scan {'>'} Attendance Record</CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        className="space-y-6"
                        onSubmit={(event) => {
                            event.preventDefault();
                            handleSubmit();
                        }}
                    >
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="action">Attendance Action</Label>
                                <Select
                                    value={data.action}
                                    onValueChange={(value: AttendanceAction) => {
                                        setData('action', value);
                                    }}
                                >
                                    <SelectTrigger id="action" className="w-full bg-card">
                                        <SelectValue placeholder="Select action" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="clock-in">Clock In</SelectItem>
                                        <SelectItem value="clock-out">Clock Out</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.action} />
                            </div>

                            <div className="flex flex-col gap-2 lg:col-span-2">
                                <Label htmlFor="remarks">Remarks</Label>
                                <Textarea
                                    id="remarks"
                                    value={data.remarks}
                                    onChange={(event) => {
                                        setData('remarks', event.target.value);
                                    }}
                                    placeholder="Optional notes for this attendance entry..."
                                    className="min-h-[100px]"
                                />
                                <InputError message={errors.remarks} />
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 gap-4 rounded-lg border border-border/60 bg-muted/20 p-4 lg:grid-cols-3">
                            <div className="flex items-center gap-2">
                                <UserRoundCheck className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">Scan Status</span>
                            </div>
                            <div>
                                <Badge variant={scanState === 'verified' ? 'default' : 'secondary'}>
                                    {scanMessages[scanState]}
                                </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                Match Score: {scanScore !== null ? `${scanScore}%` : '-'}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="capturedAt">Captured At</Label>
                                <Input id="capturedAt" value={capturedAt ? new Date(capturedAt).toLocaleString() : ''} readOnly />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="fingerprintToken">Fingerprint Token</Label>
                                <Input id="fingerprintToken" value={data.fingerprintToken} readOnly />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button type="button" variant="outline" onClick={handleFingerprintScan} disabled={scanState === 'scanning'}>
                                <Fingerprint className="mr-2 h-4 w-4" />
                                {scanState === 'scanning' ? 'Scanning...' : 'Scan Fingerprint'}
                            </Button>
                            <Button type="submit" disabled={!canSubmit || isSubmitting}>
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                {isSubmitting ? 'Recording...' : 'Record Attendance'}
                            </Button>
                            <Button type="button" variant="secondary" onClick={handleReset}>
                                <TimerReset className="mr-2 h-4 w-4" />
                                Clear
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
