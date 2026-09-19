import { Link, usePage } from '@inertiajs/react';
import { ClipboardList, LayoutGrid, Stethoscope } from 'lucide-react';
import AppLogo from '@/components/app-logo';
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
import { consult, dashboard } from '@/routes';
import { index as consultationsIndex } from '@/routes/doctor/consultations';
import type { NavItem } from '@/types';

const mainNavItems = (isDoctor: boolean): NavItem[] => {
    const items: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
    ];

    if (!isDoctor) {
        items.push({
            title: 'Consult',
            href: consult(),
            icon: Stethoscope,
        });
    }

    if (isDoctor) {
        items.push({
            title: 'Doctor Console',
            href: consultationsIndex(),
            icon: ClipboardList,
        });
    }

    return items;
};

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset" className="dark">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain
                    items={mainNavItems(
                        usePage().props.auth.user.role === 'doctor',
                    )}
                />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
