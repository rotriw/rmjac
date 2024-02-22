import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from './pages/Home.page';
import React from 'react';
import { Root } from './root/Root';

const router = createBrowserRouter([
    {
        path: '/',
        element: <Root type='route' />,
        children: [
            {
                path: '/',
                element: <HomePage />
            },

            {
                path: '/login',
                element: <HomePage />
            }
        ]
    },
]);

export function Router() {
    return <RouterProvider router={router} />;   
}
