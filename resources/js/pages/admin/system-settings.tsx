import { Head, useForm, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    Copy,
    KeyRound,
    Layers,
    Loader2,
    PlusCircle,
    Trash2,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import SystemSettingController from '@/actions/App/Http/Controllers/Admin/SystemSettingController';
import { DashboardMetricCard, DashboardPanelCard } from '@/components/admin-system-dashboard-cards';
import { AdminSystemSettingsForm } from '@/components/admin-system-settings-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import * as admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types/navigation';

type Setting = {
    key: string;
    value: string | null;
    type: string;
    label: string;
    description: string | null;
};

type BiometricDevice = {
    id: number;
    serialNumber: string;
    name: string;
    ipAddress: string | null;
    lastActivityAt: string | null;
    recordsSynced: number;
    isActive: boolean;
    apiKeySet: boolean;
};

type Props = {
    settings: Record<string, Setting[]>;
    biometricDevices: BiometricDevice[];
    groupCount: number;
    lastUpdated: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'System Settings',
        href: admin.systemSettings().url,
    },
];

const TAB_GROUPS = ['attendance', 'devices', 'ipcr', 'system'] as const;

function tabLabel(group: string): string {
    return group.charAt(0).toUpperCase() + group.slice(1);
}

/** Returns true if the device has been active in the last 5 minutes. */
function isOnline(lastActivityAt: string | null): boolean {
    if (!lastActivityAt) return false;
    const last = new Date(lastActivityAt).getTime();
    return Date.now() - last < 5 * 60 * 1000;
}

function ApiKeyBanner({ apiKey }: { apiKey: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(apiKey).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
            <div className="flex items-start gap-3">
                <KeyRound className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        Device API Key — copy this now, it will not be shown again
                    </p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-amber-100 px-2 py-1 font-mono text-xs break-all text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                            {apiKey}
                        </code>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleCopy}
                            className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-200 dark:hover:bg-amber-900/40"
                        >
                            {copied ? (
                                <CheckCircle2 className="size-4 text-emerald-600" />
                            ) : (
                                <Copy className="size-4" />
                            )}
                            {copied ? 'Copied!' : 'Copy'}
                        </Button>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                        Set this as the <strong>Authorization Bearer token</strong> in your ZKTeco device&apos;s
                        ADMS cloud configuration, or in your local middleware <code>config.json</code>.
                    </p>
                </div>
            </div>
        </div>
    );
}

function RegisterDeviceForm() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        serial_number: '',
        ip_address: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(SystemSettingController.storeDevice.url(), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
            },
            onError: () => {
                toast.error('Failed to register device. Check the form for errors.');
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="mb-6 rounded-md border border-dashed border-[#2F5E2B]/40 bg-[#DDEFD7]/30 p-4 dark:border-[#2F5E2B]/60 dark:bg-[#1F3F1D]/20">
            <div className="mb-3 flex items-center gap-2">
                <PlusCircle className="size-4 text-[#2F5E2B] dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-foreground">Register New Device</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                    <Label htmlFor="device-name" className="text-xs">
                        Device Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="device-name"
                        placeholder="e.g. Main Entrance"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        className="h-8 text-sm"
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-1">
                    <Label htmlFor="device-sn" className="text-xs">
                        Serial Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="device-sn"
                        placeholder="e.g. ABC123456789"
                        value={data.serial_number}
                        onChange={(e) => setData('serial_number', e.target.value)}
                        className="h-8 font-mono text-sm"
                    />
                    {errors.serial_number && (
                        <p className="text-xs text-destructive">{errors.serial_number}</p>
                    )}
                </div>
                <div className="space-y-1">
                    <Label htmlFor="device-ip" className="text-xs">
                        Device IP Address{' '}
                        <span className="text-muted-foreground">(optional, for Mode 2 bridge)</span>
                    </Label>
                    <Input
                        id="device-ip"
                        placeholder="e.g. 192.168.1.100"
                        value={data.ip_address}
                        onChange={(e) => setData('ip_address', e.target.value)}
                        className="h-8 font-mono text-sm"
                    />
                    {errors.ip_address && (
                        <p className="text-xs text-destructive">{errors.ip_address}</p>
                    )}
                </div>
            </div>
            <div className="mt-3 flex justify-end">
                <Button
                    type="submit"
                    size="sm"
                    disabled={processing}
                    className="bg-[#2F5E2B] text-white hover:bg-[#254a22] dark:bg-emerald-700 dark:hover:bg-emerald-800"
                >
                    {processing && <Loader2 className="mr-1 size-3 animate-spin" />}
                    Register Device
                </Button>
            </div>
        </form>
    );
}

export default function SystemSettings(props: Props) {
    const { flash } = usePage<{ flash: { success: string | null; error: string | null; deviceApiKey: string | null } }>().props;
    // Flash is a one-time server session value — present only right after device registration.
    const pendingApiKey = flash?.deviceApiKey ?? null;

    const handleDeviceToggle = (device: BiometricDevice) => {
        router.put(
            SystemSettingController.updateDevice.url(device.id),
            {},
            { preserveScroll: true },
        );
    };

    const handleDeviceDelete = (device: BiometricDevice) => {
        if (!confirm(`Remove device "${device.name}"? This cannot be undone.`)) return;
        router.delete(SystemSettingController.destroyDevice.url(device.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(`Device "${device.name}" removed.`),
            onError: (errs) => toast.error(errs.device ?? 'Failed to remove device.'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="System Settings" />
            <div className="flex w-full flex-col gap-5 p-4 md:p-6 xl:p-8">
                <div className="grid gap-4 md:grid-cols-2">
                    <DashboardMetricCard
                        title="Configuration Groups"
                        description="System parameters"
                        value={props.groupCount}
                        meta="Manage system-wide parameters"
                        icon={Layers}
                    />
                    <DashboardMetricCard
                        title="Last Updated"
                        description="Recent change"
                        value={props.lastUpdated}
                        meta="Most recent configuration change"
                        icon={Clock}
                    />
                </div>

                <DashboardPanelCard
                    title="System Configuration"
                    description="Manage system-wide parameters across all modules."
                >
                    <Tabs defaultValue="attendance">
                        <TabsList className="w-full justify-start">
                            {TAB_GROUPS.map((group) => (
                                <TabsTrigger key={group} value={group}>
                                    {tabLabel(group)}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {TAB_GROUPS.filter((group) => group !== 'devices').map((group) => (
                            <TabsContent key={group} value={group}>
                                {props.settings[group] && props.settings[group].length > 0 ? (
                                    <AdminSystemSettingsForm
                                        settings={props.settings[group]}
                                        group={group}
                                    />
                                ) : (
                                    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                                        No settings configured for this group.
                                    </div>
                                )}
                            </TabsContent>
                        ))}

                        <TabsContent value="devices">
                            <div className="space-y-4 pt-2">
                                {pendingApiKey && (
                                    <ApiKeyBanner apiKey={pendingApiKey} />
                                )}

                                <RegisterDeviceForm />

                                <div className="overflow-x-auto">
                                    <Table className="w-full">
                                        <TableHeader>
                                            <TableRow className="bg-[#2F5E2B] text-sm font-bold hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:text-white">
                                                <TableHead>Serial Number</TableHead>
                                                <TableHead>Device Name</TableHead>
                                                <TableHead>Last Activity</TableHead>
                                                <TableHead>Records Synced</TableHead>
                                                <TableHead>API Key</TableHead>
                                                <TableHead>Connection</TableHead>
                                                <TableHead>Active</TableHead>
                                                <TableHead />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {props.biometricDevices.map((device, index) => (
                                                <TableRow
                                                    key={device.id}
                                                    className={`text-sm font-semibold text-foreground ${index % 2 === 0 ? 'bg-[#DDEFD7] dark:bg-[#345A34]/80' : 'bg-[#BFDDB5] dark:bg-[#274827]/80'}`}
                                                >
                                                    <TableCell className="font-mono text-xs">
                                                        {device.serialNumber}
                                                    </TableCell>
                                                    <TableCell>{device.name}</TableCell>
                                                    <TableCell className="text-xs">
                                                        {device.lastActivityAt ?? 'Never'}
                                                    </TableCell>
                                                    <TableCell>{device.recordsSynced.toLocaleString()}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                device.apiKeySet
                                                                    ? 'gap-1 border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                                    : 'gap-1 border-gray-300 bg-gray-50 text-gray-600 dark:border-gray-600 dark:bg-gray-900/30 dark:text-gray-400'
                                                            }
                                                        >
                                                            <KeyRound className="size-3" />
                                                            {device.apiKeySet ? 'Set' : 'None'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                isOnline(device.lastActivityAt)
                                                                    ? 'gap-1 border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                    : 'gap-1 border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-900/30 dark:text-slate-400'
                                                            }
                                                        >
                                                            {isOnline(device.lastActivityAt) ? (
                                                                <Wifi className="size-3" />
                                                            ) : (
                                                                <WifiOff className="size-3" />
                                                            )}
                                                            {isOnline(device.lastActivityAt) ? 'Online' : 'Offline'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Switch
                                                            checked={device.isActive}
                                                            onCheckedChange={() =>
                                                                handleDeviceToggle(device)
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {device.serialNumber !== 'SIMULATOR' && (
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleDeviceDelete(device)}
                                                                className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                title="Remove device"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {props.biometricDevices.length === 0 && (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={8}
                                                        className="bg-[#DDEFD7] text-center dark:bg-[#345A34]/80"
                                                    >
                                                        No biometric devices registered.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DashboardPanelCard>
            </div>
        </AppLayout>
    );
}
