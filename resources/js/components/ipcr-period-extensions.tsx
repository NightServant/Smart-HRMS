import { router } from '@inertiajs/react';
import { Clock, ShieldOff, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
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
import * as adminIpcrExtensions from '@/routes/admin/ipcr/extensions';

export type ClosedPeriod = {
    id: number;
    semester: 1 | 2;
    year: number;
    label: string;
    status: 'open' | 'closed' | 'backfilled';
    closedAt: string | null;
};

export type ExtensionRow = {
    id: number;
    periodId: number;
    periodLabel: string;
    employeeId: string;
    employeeName: string;
    reason: string;
    expiresAt: string;
    isActive: boolean;
    revokedAt: string | null;
};

type Props = {
    /** Period type — distinguishes target vs evaluation in the grant payload. */
    type: 'target' | 'evaluation';
    /** All closed (or backfilled) periods this admin can grant against. */
    closedPeriods: ClosedPeriod[];
    /** Existing extensions for this type, most recent first. */
    extensions: ExtensionRow[];
};

function defaultExpiry(): string {
    // 7 days from now, formatted for <input type="datetime-local">.
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function IpcrPeriodExtensions({
    type,
    closedPeriods,
    extensions,
}: Props): React.ReactNode {
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [periodKey, setPeriodKey] = useState<string>(
        closedPeriods[0] ? `${closedPeriods[0].semester}-${closedPeriods[0].year}` : '',
    );
    const [employeeId, setEmployeeId] = useState<string>('');
    const [expiresAt, setExpiresAt] = useState<string>(defaultExpiry());
    const [reason, setReason] = useState<string>('');

    const selectedPeriod = useMemo(
        () => closedPeriods.find((p) => `${p.semester}-${p.year}` === periodKey) ?? null,
        [closedPeriods, periodKey],
    );

    function resetForm(): void {
        setEmployeeId('');
        setExpiresAt(defaultExpiry());
        setReason('');
        setError(null);
    }

    function handleGrant(): void {
        setError(null);
        if (!selectedPeriod) {
            setError('Pick a closed period to grant the extension against.');
            return;
        }
        if (!employeeId.trim()) {
            setError('Employee ID is required.');
            return;
        }
        if (!reason.trim()) {
            setError('Reason is required.');
            return;
        }
        if (!expiresAt) {
            setError('Expiry date and time are required.');
            return;
        }

        setSubmitting(true);
        router.post(
            adminIpcrExtensions.grant().url,
            {
                type,
                semester: selectedPeriod.semester,
                year: selectedPeriod.year,
                employee_id: employeeId.trim(),
                expires_at: new Date(expiresAt).toISOString(),
                reason: reason.trim(),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setOpen(false);
                    resetForm();
                },
                onError: (errors) => {
                    setError(
                        (errors.employee_id as string | undefined) ??
                            (errors.expires_at as string | undefined) ??
                            (errors.period as string | undefined) ??
                            (errors.reason as string | undefined) ??
                            'Could not grant the extension.',
                    );
                },
                onFinish: () => setSubmitting(false),
            },
        );
    }

    function handleRevoke(extensionId: number): void {
        if (!confirm('Revoke this extension? The employee will no longer be able to submit for the closed period.')) {
            return;
        }
        router.delete(adminIpcrExtensions.revoke(extensionId).url, {
            preserveScroll: true,
        });
    }

    return (
        <Card className="glass-card border-border bg-card shadow-sm">
            <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Clock className="size-5 text-[#2F5E2B] dark:text-[#9AC68E]" />
                            <CardTitle className="text-lg">
                                Manage Extensions
                            </CardTitle>
                        </div>
                        <CardDescription className="max-w-3xl text-sm leading-6">
                            Grant a single employee a time-bounded window to
                            submit for a closed period. The global period stays
                            closed for everyone else; the recipient is notified
                            individually.
                        </CardDescription>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                            resetForm();
                            setOpen(true);
                        }}
                        disabled={closedPeriods.length === 0}
                    >
                        <UserPlus className="mr-1.5 size-4" />
                        Grant extension
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {extensions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No extensions have been granted yet.
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-md border border-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-2 text-left">Employee</th>
                                    <th className="px-4 py-2 text-left">Period</th>
                                    <th className="px-4 py-2 text-left">Expires</th>
                                    <th className="px-4 py-2 text-left">Reason</th>
                                    <th className="px-4 py-2 text-left">Status</th>
                                    <th className="px-4 py-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {extensions.map((ext) => (
                                    <tr key={ext.id} className="border-t border-border">
                                        <td className="px-4 py-2">
                                            <div className="font-medium">{ext.employeeName}</div>
                                            <div className="text-xs text-muted-foreground">{ext.employeeId}</div>
                                        </td>
                                        <td className="px-4 py-2">{ext.periodLabel}</td>
                                        <td className="px-4 py-2">
                                            {new Date(ext.expiresAt).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2 max-w-xs truncate" title={ext.reason}>
                                            {ext.reason}
                                        </td>
                                        <td className="px-4 py-2">
                                            {ext.isActive ? (
                                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                    Active
                                                </Badge>
                                            ) : ext.revokedAt ? (
                                                <Badge variant="outline">Revoked</Badge>
                                            ) : (
                                                <Badge variant="outline">Expired</Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {ext.isActive ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRevoke(ext.id)}
                                                >
                                                    <ShieldOff className="mr-1 size-4" />
                                                    Revoke
                                                </Button>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Grant submission extension</DialogTitle>
                        <DialogDescription>
                            Open a single closed period for one employee. The
                            global period stays closed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Closed period</Label>
                            <Select value={periodKey} onValueChange={setPeriodKey}>
                                <SelectTrigger className="border-border bg-background">
                                    <SelectValue placeholder="Select a closed period" />
                                </SelectTrigger>
                                <SelectContent>
                                    {closedPeriods.map((p) => (
                                        <SelectItem
                                            key={`${p.semester}-${p.year}`}
                                            value={`${p.semester}-${p.year}`}
                                        >
                                            {p.label}
                                            {p.status === 'backfilled' ? ' (backfilled)' : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ext-employee-id">Employee ID</Label>
                            <Input
                                id="ext-employee-id"
                                value={employeeId}
                                onChange={(e) => setEmployeeId(e.target.value)}
                                placeholder="e.g. EMP-001"
                                className="border-border bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ext-expires-at">Expires at</Label>
                            <Input
                                id="ext-expires-at"
                                type="datetime-local"
                                value={expiresAt}
                                onChange={(e) => setExpiresAt(e.target.value)}
                                className="border-border bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ext-reason">Reason (required)</Label>
                            <textarea
                                id="ext-reason"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                                maxLength={500}
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="e.g. Employee was on approved medical leave during the original window."
                            />
                        </div>
                        {error ? <p className="text-xs text-destructive">{error}</p> : null}
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
                            onClick={handleGrant}
                            disabled={submitting || !reason.trim() || !employeeId.trim()}
                        >
                            {submitting ? 'Granting…' : 'Grant extension'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
