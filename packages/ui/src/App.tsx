import {MantineProvider, Text, useMantineColorScheme, useMantineTheme, ColorScheme, } from '@mantine/core';
import {BrowserRouter as Router, Routes, Route, useNavigate, useLocation} from 'react-router-dom';
import { NotificationsProvider } from '@mantine/notifications';
import {useToggle} from "@mantine/hooks";
import React from "react";
import {HeaderShowNew} from "./template/header";
import {LoginHandler} from "./template/login";

export default function App() {
    let mainLinks = [];
    if (localStorage.getItem('setting-user-login') === 'false' || localStorage.getItem('setting-user-login') === undefined) {
        mainLinks = [
            {link: '/', label: '主页'},
            {link: '/login', label: '登录'},
            {link: '/list', label: '题单'},
        ];
    } else {
        mainLinks = [
            {link: '/', label: '主页'},
            {link: '/list', label: '题单'},
            {link: '/userMain', label: '个人中心'},
            {link: '/logout', label: '退出登录'},
        ];
    }
    mainLinks.push({link: '/about', label: '关于'});
    const [ colorScheme, toggleColorScheme ] = useToggle(localStorage.getItem(`bgColor`) === 'dark' ? [ 'dark', 'light'] : ['light', 'dark']);

    return (
        <>
            <Router>
                <MantineProvider withGlobalStyles withNormalizeCSS theme={{primaryColor: 'indigo', colorScheme: colorScheme as ColorScheme, }}>
                    <NotificationsProvider>
                        <HeaderShowNew links={mainLinks} colorScheme={toggleColorScheme} colorSchemeData={colorScheme}></HeaderShowNew>

                        <Routes>
                            {/*<Route path='' element={ <HomePage LoginStatus={localStorage.getItem('setting-user-login') === 'true'} /> } />*/}
                            <Route path='/login' element={ <LoginHandler />} />
                        </Routes>
                    </NotificationsProvider>
                </MantineProvider>
            </Router>
        </>
    );
}
