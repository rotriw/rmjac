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
import {UMain} from "./pages/umain";
import { RegisterHandler } from './pages/register';

declare global {
    interface Window {
        RMJ?: any;
    }
}

window.RMJ = {
    baseurl: 'https://api.rmj.ac/'
}

export default function App() {
    let mainLinks = [];
    if (localStorage.getItem('setting-user-login') === 'true') {
        mainLinks = [
            {link: '/', label: '主页'},
            {link: '/umain', label: '个人中心'},
        ];
    } else {
        mainLinks = [
            {link: '/', label: '主页'},
            {link: '/login', label: '登录'},
        ];
    }
    const [ colorScheme, toggleColorScheme ] = useToggle(localStorage.getItem(`bgColor`) === 'dark' ? [ 'dark', 'light'] : ['light', 'dark']);
    return (
        <>
            <Router>
                <MantineProvider  withCSSVariables withGlobalStyles withNormalizeCSS theme={{primaryColor: 'indigo', colorScheme: colorScheme as ColorScheme, }}>
                    <NotificationsProvider>
                        <NavigationProgress />
                        <HeaderShowNew links={mainLinks} colorScheme={toggleColorScheme} colorSchemeData={colorScheme}></HeaderShowNew>
                        <Routes>
                            <Route path='' element={ <HomePage LoginStatus={localStorage.getItem('setting-user-login') === 'true'} /> } />
                            <Route path='/login' element={ <LoginHandler />} />
                            <Route path='/register' element={ <RegisterHandler />} />
							<Route path='/new' element={<NewProblem />} />
                            <Route path='/umain' element={ <UMain />} />
                            <Route path='/umain/:set' element={ <UMain />} />
                            <Route path='/view/:id' element={<ViewProblem/>} />
                            <Route path='/view/:id/:page' element={<ViewProblem/>} />
                            <Route path='/view/:id/:page/fastview/:viewed' element={<ViewProblem/>} />
                        </Routes>
                    </NotificationsProvider>
                </MantineProvider>
            </Router>
        </>
    );
}
