import React, { useState } from 'react';
import '@mantine/core/styles.css';
import { MantineProvider, createTheme, CSSVariablesResolver } from '@mantine/core';
import { Button, Text } from '@mantine/core';
// import { BrowserRouter, Route, Routes } from 'react-router-dom';
// import { Root } from './structure/root';
// import '@mantine/notifications/styles.css';
// import HomePage from './pages/home';
// import LoginPage from './pages/login';
import store from './store/store';
import { Provider } from 'react-redux';
// import { Notifications } from '@mantine/notifications';
// import * as Direct from './interfaces/interface';
import './app.css';
// import { ProblemViewPage } from './pages/problemView';
// import { SubmissionResultPage } from './pages/submissionResult';
// import { ProblemEditor } from './pages/problemEditor';
// import { EventShow } from './pages/event';
import { I18nextProvider } from 'react-i18next';
// import { ProblemList } from './pages/problemList';

// const myCache = createEmotionCache({ key: 'rmjac' });

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        web?: any;
        nowPage: string;
    }
}


function App() {
    const resolver: CSSVariablesResolver = (theme) => ({
        variables: {
            // '--mantine-hero-height': theme.other.heroHeight,
        },
        light: {
            '--background-color': '#f7f7f7',
            '--color-html-background': 'white',
        },
        dark: {
            '--background-color': theme.colors.dark[7],
            '--color-html-background': '2C2E33',
        },
    });
    const theme = createTheme({
        shadows: {
            xs: '0 4px 10px rgba(0,0,0,0.05), 0 0 1px rgba(0,0,0,0.1);',
        },
    });

    return (
        <>
            <Provider store={store}>
                <MantineProvider
                    theme={theme}
                    classNamesPrefix='rmjac'
                    cssVariablesResolver={resolver}
                >
                    
                    <>
                        Hello world!

                        <Text size='sm'>233</Text>
                        <Button variant='filled'>
                            qwq<>233</>
                        </Button>
                            {/* <SubmissionResultPage></SubmissionResultPage> */}
                    </>
                    
                </MantineProvider>
            </Provider>
        </>
    );
}

export default App;
