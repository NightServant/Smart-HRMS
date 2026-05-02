import { router } from '@inertiajs/react';
import { Archive, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import * as adminIpcrHistorical from '@/routes/admin/ipcr/historical';

type Props = {
    /** Period type — controls which endpoint is hit and which fields are shown. */
    type: 'target' | 'evaluation';
};

const currentYear = new Date().getFullYear();

export default function IpcrHistoricalEntry({ type }: Props): React.ReactNode {
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [employeeId, setEmployeeId] = useState('');
    const [semester, setSemester] = useState<'1' | '2'>('1');
    const [year, setYear] = useState<string>(String(currentYear - 1));
    const [finalRating, setFinalRating] = useState<string>('');
    const [adjectival, setAdjectival] = useState<string>('');
    const [note, setNote] = useState<string>('');

    function reset(): void {
        setEmployeeId('');
        setSemester('1');
        setYear(String(currentYear - 1));
        setFinalRating('');
        setAdjectival('');
        setNote('');
        setError(null);
    }

    function handleSubmit(): void {
        setError(null);
        if (!employeeId.trim()) {
            setError('Employee ID is required.');
            return;
        }
        const yearNum = Number(year);
        if (!Number.isInteger(yearNum) || yearNum < 2020 || yearNum > 2099) {
            setError('Year must be a 4-digit value between 2020 and 2099.');
            return;
        }
        if (type === 'evaluation') {
            const rating = Number(finalRating);
            if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
                setError('Final rating must be between 0 and 5.');
                return;
            }
        }

        setSubmitting(true);
        const url =
            type === 'target'
                ? adminIpcrHistorical.target().url
                : adminIpcrHistorical.evaluation().url;

        const payload =
            type === 'target'
                ? {
                      employee_id: employeeId.trim(),
                      semester: Number(semester),
                      year: yearNum,
                      note: note.trim() || null,
                  }
                : {
                      employee_id: employeeId.trim(),
                      semester: Number(semester),
                      year: yearNum,
                      final_rating: Number(finalRating),
                      adjectival_rating: adjectival.trim() || null,
                      note: note.trim() || null,
                  };

        router.post(url, payload, {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                reset();
            },
            onError: (errors) => {
                const first = Object.values(errors)[0];
                setError(
                    typeof first === 'string'
                        ? first
                        : 'Could not record the historical entry.',
                );
            },
            onFinish: () => setSubmitting(false),
        });
    }

    const heading = type === 'target' ? 'IPCR Targets' : 'IPCR Evaluations';

    return (
        <Card className="glass-card border-border bg-card shadow-sm">
            <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Archive className="size-5 text-[#2F5E2B] dark:text-[#9AC68E]" />
                            <CardTitle className="text-lg">
                                Historical Entry — {heading}
                            </CardTitle>
                        </div>
                        <CardDescription className="max-w-3xl text-sm leading-6">
                            Record completed records for past semesters
                            directly. No notifications fire and the entry is
                            tagged <code>source = backfilled</code> so analytics
                            and PPE/ATRE training can identify it.
                        </CardDescription>
                    </div>
                    <Button type="button" size="sm" onClick={() => setOpen(true)}>
                        <ClipboardList className="mr-1.5 size-4" />
                        Add historical record
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-xs text-muted-foreground">
                    Use this when the system was deployed mid-cycle, or HR
                    needs to attach a paper-record cycle to the digital ledger
                    for reporting.
                </p>
            </CardContent>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Add historical {type === 'target' ? 'target' : 'evaluation'}
                        </DialogTitle>
                        <DialogDescription>
                            Records are saved as already-finalized. The
                            employee will not be notified.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="hist-employee-id">Employee ID</Label>
                            <Input
                                id="hist-employee-id"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                placeholder="e.g. EMP-001"
                                className="border-border bg-background"
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Semester</Label>
                                <Select
                                    value={semester}
                                    onValueChange={(v) => setSemester(v === '2' ? '2' : '1')}
                                >
                                    <SelectTrigger className="border-border bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">First Semester (Jan–Jun)</SelectItem>
                                        <SelectItem value="2">Second Semester (Jul–Dec)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="hist-year">Year</Label>
                                <Input
                                    id="hist-year"
                                    type="number"
                                    min={2020}
                                    max={2099}
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    className="border-border bg-background"
                                />
                            </div>
                        </div>
                        {type === 'evaluation' ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="hist-final-rating">Final rating</Label>
                                    <Input
                                        id="hist-final-rating"
                                        type="number"
                                        step={0.01}
                                        min={0}
                                        max={5}
                                        value={finalRating}
                                        onChange={(e) => setFinalRating(e.target.value)}
                                        className="border-border bg-background"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hist-adjectival">Adjectival rating</Label>
                                    <Input
                                        id="hist-adjectival"
                                        value={adjectival}
                                        onChange={(e) => setAdjectival(e.target.value)}
                                        placeholder="e.g. Outstanding"
                                        className="border-border bg-background"
                                    />
                                </div>
                            </div>
                        ) : null}
                        <div className="space-y-2">
                            <Label htmlFor="hist-note">Note</Label>
                            <textarea
                                id="hist-note"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                rows={3}
                                maxLength={1000}
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="Optional context for auditors."
                            />
                        </div>
                        {error ? (
                            <p className="text-xs text-destructive">{error}</p>
                        ) : null}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting || !employeeId.trim()}
                        >
                            {submitting ? 'Saving…' : 'Record entry'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
