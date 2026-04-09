import { Head } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { Clock, Layers, Wifi, WifiOff } from 'lucide-react';
import SystemSettingController from '@/actions/App/Http/Controllers/Admin/SystemSettingController';
import { DashboardMetricCard, DashboardPanelCard } from '@/components/admin-system-dashboard-cards';
import { AdminSystemSettingsForm } from '@/components/admin-system-settings-form';
import { Badge } from '@/components/ui/badge';
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
    lastActivityAt: string | null;
    recordsSynced: number;
    isActive: boolean;
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

export default function SystemSettings(props: Props) {
    const handleDeviceToggle = (device: BiometricDevice) => {
        router.put(
            SystemSettingController.updateDevice.url(device.id),
            {},
            { preserveScroll: true },
        );
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
                            <div className="overflow-x-auto">
                                <Table className="w-full">
                                    <TableHeader>
                                        <TableRow className="bg-[#2F5E2B] text-sm font-bold hover:bg-[#2F5E2B] dark:bg-[#1F3F1D] dark:hover:bg-[#1F3F1D] [&_th]:text-white">
                                            <TableHead>Serial Number</TableHead>
                                            <TableHead>Device Name</TableHead>
                                            <TableHead>Last Activity</TableHead>
                                            <TableHead>Records Synced</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Active</TableHead>
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
                                                <TableCell>{device.lastActivityAt ?? 'Never'}</TableCell>
                                                <TableCell>{device.recordsSynced.toLocaleString()}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            device.isActive
                                                                ? 'gap-1 border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                                : 'gap-1 border-red-300 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                        }
                                                    >
                                                        {device.isActive ? (
                                                            <Wifi className="size-3" />
                                                        ) : (
                                                            <WifiOff className="size-3" />
                                                        )}
                                                        {device.isActive ? 'Online' : 'Offline'}
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
                                            </TableRow>
                                        ))}
                                        {props.biometricDevices.length === 0 && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={6}
                                                    className="bg-[#DDEFD7] text-center dark:bg-[#345A34]/80"
                                                >
                                                    No biometric devices registered.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DashboardPanelCard>
            </div>
        </AppLayout>
    );
}
