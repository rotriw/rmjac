import '@mantine/core/styles.css';
import { MantineProvider } from '@mantine/core';
import { Router } from './Router';
import { theme } from './theme';
import React from 'react';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        web?: any;
        nowPage: string;
    }
}

export default function App() {
    return (
        <MantineProvider classNamesPrefix='rmjac' theme={theme}>
            <Router />
        </MantineProvider>
    );
}
