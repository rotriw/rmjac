import React, { useState } from 'react';
import { MantineProvider, ColorScheme, createEmotionCache } from '@mantine/core';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Root } from './structure/root';
import HomePage from './pages/home';
import LoginPage from './pages/login';
import store from './store/store';
import { Provider } from 'react-redux';
import { Notifications } from '@mantine/notifications';
import * as Direct from './interfaces/interface';
import './app.css';

const myCache = createEmotionCache({ key: 'school-hub' });

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        web?: any;
        nowPage: string;
    }
}

function App() {
    const [colorScheme, setColorScheme] = useState('light');
    const beforeColorScheme = localStorage.getItem('colorScheme');

    if (beforeColorScheme === null) {
        localStorage.setItem('colorScheme', 'light');
        setColorScheme('light');
    } else {
        if (beforeColorScheme !== colorScheme) {
            setColorScheme(beforeColorScheme);
        }
    }

    function onThemeChange() {
        if (colorScheme === 'light') {
            setColorScheme('dark');
            if (typeof window !== 'undefined') {
                localStorage.setItem('colorScheme', 'dark');
            }
        } else {
            setColorScheme('light');
            if (typeof window !== 'undefined') {
                localStorage.setItem('colorScheme', 'light');
            }
        }
        const setItemEvent = new Event('changeTheme');
        window.dispatchEvent(setItemEvent);
    }

    return (
        <>
            <Provider store={store}>
                <MantineProvider
                    emotionCache={myCache}
                    withGlobalStyles
                    withNormalizeCSS
                    theme={{
                        colorScheme: colorScheme as ColorScheme,
                        globalStyles: (theme) => ({
                            '#root': {
                                backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : '#f7f7f7',
                            },
                        }),
                        shadows: {
                            xs: '0 4px 10px rgba(0,0,0,0.05), 0 0 1px rgba(0,0,0,0.1);',
                        },
                    }}
                >
                    {window?.web?.type === 'back' ? (
                        <Root onThemeChange={onThemeChange} type='direct'>
                            {// eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (Direct as any)[window?.web?.template](window?.web?.data)}
                        </Root>
                    ) : (
                        <>
                            <Notifications position='top-center' />
                            <BrowserRouter>
                                <Routes>
                                    <Route path='' element={<Root type='route' onThemeChange={onThemeChange} />}>
                                        <Route path='' element={<HomePage></HomePage>} />
                                        <Route path='/login' element={<LoginPage></LoginPage>} />
                                    </Route>
                                </Routes>
                            </BrowserRouter>
                        </>
                    )}
                </MantineProvider>
            </Provider>
        </>
    );
}

export default App;
