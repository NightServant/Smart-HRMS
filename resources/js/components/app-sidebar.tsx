import { Link, router, usePage } from '@inertiajs/react';
import { Bell, CalendarClock, ClipboardCheck, FileStack, FileUser, Fingerprint, Grid, LayoutDashboard, PieChart, ScrollText, Send, ShieldPlus, Users } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { attendance, dashboard, leaveApplication, documentManagement, performanceDashboard, notifications, submitEvaluation } from '@/routes';
import * as admin from '@/routes/admin';
import type { Auth, NavItem } from '@/types';
import AppLogo from './app-logo';

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
        title: 'Form Submission',
        href: submitEvaluation(),
        icon: Send,
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
        title: 'Documents',
        href: documentManagement(),
        icon: FileStack,
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
        title: 'Training Scheduling',
        href: admin.trainingScheduling(),
        icon: CalendarClock,
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
        title: 'Audit Logs',
        href: admin.auditLogs(),
        icon: ScrollText,
    },
    {
        title: 'Notifications',
        href: notifications(),
        icon: Bell,
    },
];

export function AppSidebar() {
    const { auth, unreadNotificationCount } = usePage<{ auth: Auth; unreadNotificationCount: number }>().props;

    // Poll for unread notification count every 15 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['unreadNotificationCount'] });
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    const mainNavItems = auth.user.role === 'administrator'
        ? administratorNavItems
        : auth.user.role === 'evaluator'
        ? evaluatorNavItems
        : auth.user.role === 'hr-personnel'
            ? hrPersonnelNavItems
            : employeeNavItems;

    const itemsWithBadge = useMemo(() => {
        return mainNavItems.map(item =>
            item.title === 'Notifications' ? { ...item, badge: unreadNotificationCount } : item
        );
    }, [mainNavItems, unreadNotificationCount]);

    const homeLink = auth.user.role === 'administrator'
        ? admin.systemDashboard()
        : auth.user.role === 'hr-personnel'
        ? admin.performanceDashboard()
        : auth.user.role === 'evaluator'
            ? performanceDashboard()
            : dashboard();

    return (
        <Sidebar collapsible="icon" variant="sidebar" >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={homeLink} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={itemsWithBadge} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
