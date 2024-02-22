import { Outlet } from "react-router-dom";
import React from 'react';
import { AppShell } from "@mantine/core";
import App from "@/App";
import { NavBar } from "@/components/Navbar/Navbar";

interface RootProps {
    type: 'route' | 'direct';
    children?: JSX.Element[] | JSX.Element | string;
}

export function Root({ type, children }: RootProps) {
    const mainLinks = window.web?.links || [];
    return <>
        <AppShell >
            <AppShell.Header withBorder={false}>
                <NavBar title={window.web?.title || 'rmj.ac'} links={mainLinks} type={type}></NavBar>
            </AppShell.Header>
            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
            <AppShell.Footer>

            </AppShell.Footer>
        </AppShell>
    </>
}