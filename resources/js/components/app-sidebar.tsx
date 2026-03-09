import { Link, usePage } from '@inertiajs/react';
import { Bell, CalendarClock, ClipboardCheck, FileStack, FileUser, Grid, PieChart, Users } from 'lucide-react';
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
import { dashboard, attendance, leaveApplication, documentManagement, performanceDashboard, notifications } from '@/routes';
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
        title:'Attendance',
        href: attendance(),
        icon: ClipboardCheck,
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
        href: admin.leaveManagement(),
        icon: FileUser,
    },
    {
        title: 'Training Scheduling',
        href: admin.trainingScheduling(),
        icon: CalendarClock,
    },
];

export function AppSidebar() {
    const { auth } = usePage<{ auth: Auth }>().props;

    const mainNavItems = auth.user.role === 'evaluator'
        ? evaluatorNavItems
        : auth.user.role === 'hr-personnel'
            ? hrPersonnelNavItems
            : employeeNavItems;

    const homeLink = auth.user.role === 'hr-personnel'
        ? admin.performanceDashboard()
        : auth.user.role === 'evaluator'
            ? performanceDashboard()
            : dashboard();

    return (
        <Sidebar collapsible="icon" variant="sidebar">
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
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
