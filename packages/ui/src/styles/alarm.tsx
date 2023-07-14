/* eslint-disable @typescript-eslint/no-unused-vars */
import { MantineTheme } from '@mantine/core';

function getAlarmBackgroundColor(theme: MantineTheme, status: 'error' | 'success') {
    const fade = theme.colorScheme === 'dark' ? 8 : 6;
    if (status === 'error') {
        return theme.colors.red[fade];
    } else {
        return theme.colors.green[fade];
    }
}

export function alarm(status: 'error' | 'success') {
    return (theme: MantineTheme) => ({
        root: {
            backgroundColor: getAlarmBackgroundColor(theme, status),
            borderColor: getAlarmBackgroundColor(theme, status),
            '&::before': { backgroundColor: theme.white },
        },
        title: { color: theme.white },
        description: { color: theme.white },
    });
} 
