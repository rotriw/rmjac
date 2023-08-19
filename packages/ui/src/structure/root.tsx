/* eslint-disable @typescript-eslint/no-unused-vars */
import { createStyles, AppShell, rem, Space } from '@mantine/core';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { Navbar } from '../components/navbar';
import React from 'react';
import { AppFooter } from '../structure/footer';
import { updateNewPageBackEndData } from '../interfaces/data';
import { Toaster } from 'react-hot-toast';

const useStyles = createStyles((theme) => ({}));

interface RootProps {
    onThemeChange: () => void;
    type: 'route' | 'direct';
    children?: JSX.Element[] | JSX.Element | string;
}

export function Root({ onThemeChange, type, children }: RootProps) {
    const { classes, cx, theme } = useStyles();
    // const userState = useAppSelector((state) => state.user);
    const mainLinks = window?.web?.links || [];
    const location = type == 'direct' ? {pathname: 'unk '} : useLocation();
    React.useEffect(() => {
        if (window.nowPage === undefined) {
            window.nowPage = location.pathname;
        } else if (window.nowPage !== location.pathname) {
            updateNewPageBackEndData(location.pathname);
        }
    }, [location]);
    return (
        <AppShell
            styles={{
                main: {
                    minHeight: 'calc(100vh - 12rem)',
                    paddingTop: rem('25px'),
                    paddingBottom: 'calc(var(--mantine-header-height, 0px) + 0.05rem)',
                },
            }}
            padding='md'
            footer={<AppFooter onThemeChange={onThemeChange}></AppFooter>}
            header={<Navbar title={window.web?.title || 'rmj.ac'} links={mainLinks} type={type}></Navbar>}
        >
        <Toaster
            position="top-center"
            toastOptions={{
                className: '',
                style: {
                    fontSize: 14,
                    fontWeight: 600,
                    background: theme.colorScheme === 'dark' ? '#363636' : 'white',
                    color: theme.colorScheme === 'dark' ? '#fff' : '#363636',
                },
            }}
        />
            <Space h={50} />
            {type === 'route' ? <Outlet /> : children}
            <Space h={50} />
        </AppShell>
    );
}
