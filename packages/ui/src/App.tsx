import {MantineProvider, Text, useMantineColorScheme, useMantineTheme, ColorScheme, } from '@mantine/core';
import {BrowserRouter as Router, Routes, Route, useNavigate, useLocation} from 'react-router-dom';
import { NotificationsProvider } from '@mantine/notifications';
import {useToggle} from "@mantine/hooks";
import React from "react";
import {HeaderShowNew} from "./template/header";
import {LoginHandler} from "./pages/login";
import {HomePage} from "./pages/home";
import {NewProblem} from "./pages/newproblem";
import {NavigationProgress} from "@mantine/nprogress";
import {ViewProblem} from "./pages/viewproblem";

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
            {link: '/logout', label: '退出登录'},
        ];
    }
    // mainLinks.push({link: '/about', label: '关于'});
    const [ colorScheme, toggleColorScheme ] = useToggle(localStorage.getItem(`bgColor`) === 'dark' ? [ 'dark', 'light'] : ['light', 'dark']);

    return (
        <>
            <Router>
                <MantineProvider withGlobalStyles withNormalizeCSS theme={{primaryColor: 'indigo', colorScheme: colorScheme as ColorScheme, }}>
                    <NotificationsProvider>
                        <NavigationProgress />
                        <HeaderShowNew links={mainLinks} colorScheme={toggleColorScheme} colorSchemeData={colorScheme}></HeaderShowNew>
                        <Routes>
                            <Route path='' element={ <HomePage LoginStatus={localStorage.getItem('setting-user-login') === 'true'} /> } />
                            <Route path='/login' element={ <LoginHandler />} />
                            <Route path='/new' element={ <NewProblem />} />

                            <Route path='/view/:id' element={<ViewProblem />} />
                        </Routes>
                    </NotificationsProvider>
                </MantineProvider>
            </Router>
        </>
    );
}
