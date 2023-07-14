/* eslint-disable @typescript-eslint/no-unused-vars */
import { createStyles, AppShell, rem } from '@mantine/core';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { Navbar } from '../components/navbar';
import React from 'react';
import { AppFooter } from '../structure/footer';
import { updateNewPageBackEndData } from '../interfaces/data';

const useStyles = createStyles((theme) => ({}));

interface RootProps {
    onThemeChange: () => void;
    type: 'route' | 'direct';
    children?: JSX.Element[] | JSX.Element | string;
}

export function Root({ onThemeChange, type, children }: RootProps) {
    const { classes, cx, theme } = useStyles();
    // const userState = useAppSelector((state) => state.user);
    const mainLinks = [
        { link: '/', label: '主页' },
        { link: '/login', label: '登录' },
    ];
    const location = useLocation();
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
            header={<Navbar title='title' links={mainLinks} type={type}></Navbar>}
        >
            {type === 'route' ? <Outlet /> : children}
        </AppShell>
    );
}
