import { MantineTheme } from '@mantine/core';

export function standardTitleColor(theme: MantineTheme): string {
    return theme.colorScheme === 'dark' ? 'white' : theme.colors.gray[7];
}