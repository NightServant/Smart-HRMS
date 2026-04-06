import { router, usePage } from '@inertiajs/react';
import {
    Activity,
    BarChart3,
    Bell,
    CalendarClock,
    ClipboardCheck,
    FileStack,
    FileText,
    FileUser,
    Fingerprint,
    Grid,
    LayoutDashboard,
    PieChart,
    ScrollText,
    Send,
    Settings,
    ShieldPlus,
    Target,
    Users,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import {
    attendance,
    dashboard,
    leaveApplication,
    documentManagement,
    performanceDashboard,
    notifications,
    submitEvaluation,
} from '@/routes';
import * as ipcr from '@/routes/ipcr';
import * as admin from '@/routes/admin';
import type { Auth, NavItem } from '@/types';

const employeeNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: PieChart,
    },
    {
        title: 'Leave Application',
        href: leaveApplication().url,
        icon: FileUser,
    },
    {
        title: 'Performance Evaluation',
        href: submitEvaluation(),
        icon: Send,
        children: [
            {
                title: 'IPCR Target',
                href: ipcr.target(),
                icon: Target,
            },
            {
                title: 'IPCR Submission',
                href: submitEvaluation(),
                icon: FileText,
            },
        ],
    },
    {
        title: 'Attendance',
        href: attendance(),
        icon: Fingerprint,
    },
    {
        title: 'Notifications',
        href: notifications(),
        icon: Bell,
    },
];

const evaluatorNavItems: NavItem[] = [
    {
        title: 'Performance Dashboard',
        href: performanceDashboard(),
        icon: Grid,
    },
    {
        title: 'Employee Directory',
        href: admin.employeeDirectory(),
        icon: Users,
    },
    {
        title: 'Attendance Management',
        href: admin.evaluatorAttendance(),
        icon: ClipboardCheck,
    },
    {
        title: 'Performance Evaluation',
        href: documentManagement(),
        icon: FileStack,
        children: [
            {
                title: 'IPCR Target',
                href: documentManagement(),
                icon: Target,
            },
            {
                title: 'IPCR Submission',
                href: documentManagement(),
                icon: FileText,
            },
        ],
    },
    {
        title: 'Leave Management',
        href: admin.leaveManagement(),
        icon: FileUser,
    },
    {
        title: 'Notifications',
        href: notifications(),
        icon: Bell,
    },
];

const hrPersonnelNavItems: NavItem[] = [
    {
        title: 'Performance Dashboard',
        href: admin.performanceDashboard(),
        icon: PieChart,
    },
    {
        title: 'Employee Directory',
        href: admin.employeeDirectory(),
        icon: Users,
    },
    {
        title: 'Attendance Management',
        href: admin.attendanceManagement(),
        icon: ClipboardCheck,
    },
    {
        title: 'Historical Data',
        href: admin.historicalData(),
        icon: FileStack,
    },
    {
        title: 'Leave Management',
        href: admin.hrLeaveManagement(),
        icon: FileUser,
    },
    {
        title: 'Performance Evaluation',
        href: admin.hrReview(),
        icon: Send,
        children: [
            {
                title: 'IPCR Target',
                href: admin.hrReview(),
                icon: Target,
            },
            {
                title: 'IPCR Submission',
                href: admin.hrReview(),
                icon: FileText,
            },
        ],
    },
    {
        title: 'Training Suggestions',
        href: admin.trainingScheduling(),
        icon: CalendarClock,
    },
    {
        title: 'Notifications',
        href: notifications(),
        icon: Bell,
    },
];

const pmtNavItems: NavItem[] = [
    {
        title: 'Performance Evaluation',
        href: admin.pmtReview(),
        icon: ClipboardCheck,
        children: [
            {
                title: 'IPCR Target',
                href: admin.pmtReview(),
                icon: Target,
            },
            {
                title: 'IPCR Submission',
                href: admin.pmtReview(),
                icon: FileText,
            },
        ],
    },
    {
        title: 'Notifications',
        href: notifications(),
        icon: Bell,
    },
];

const administratorNavItems: NavItem[] = [
    {
        title: 'System Dashboard',
        href: admin.systemDashboard(),
        icon: LayoutDashboard,
    },
    {
        title: 'User Management',
        href: admin.userManagement(),
        icon: ShieldPlus,
    },
    {
        title: 'System Settings',
        href: admin.systemSettings(),
        icon: Settings,
    },
    {
        title: 'Reports',
        href: admin.reports(),
        icon: BarChart3,
    },
    {
        title: 'Audit Logs',
        href: admin.auditLogs(),
        icon: ScrollText,
    },
    {
        title: 'Activity Logs',
        href: admin.activityLogs(),
        icon: Activity,
    },
];

export function AppSidebar() {
    const { auth, unreadNotificationCount } = usePage<{
        auth: Auth;
        unreadNotificationCount: number;
    }>().props;

    // Poll for unread notification count every 15 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['unreadNotificationCount'] });
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    const mainNavItems =
        auth.user.role === 'administrator'
            ? administratorNavItems
            : auth.user.role === 'evaluator'
              ? evaluatorNavItems
              : auth.user.role === 'hr-personnel'
                ? hrPersonnelNavItems
                : auth.user.role === 'pmt'
                  ? pmtNavItems
                  : employeeNavItems;

    const itemsWithBadge = useMemo(() => {
        return mainNavItems.map((item) =>
            item.title === 'Notifications'
                ? { ...item, badge: unreadNotificationCount }
                : item,
        );
    }, [mainNavItems, unreadNotificationCount]);

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader className="border-b border-sidebar-border/50 p-3">
                <div className="flex items-center justify-between gap-3 group-data-[collapsible=icon]:justify-center">
                    <span className="px-1 text-[0.68rem] font-semibold tracking-[0.22em] text-sidebar-foreground/70 uppercase group-data-[collapsible=icon]:hidden">
                        Platform
                    </span>
                    <SidebarTrigger className="rounded-full border border-sidebar-border/70 bg-sidebar-accent/75 p-1.5 text-sidebar-foreground shadow-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
                </div>
            </SidebarHeader>
            <SidebarContent className="pt-4">
                <NavMain items={itemsWithBadge} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
