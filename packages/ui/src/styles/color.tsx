import { MantineColorScheme, useMantineTheme } from '@mantine/core';

export function standardTitleColor(theme: {
    colorScheme: MantineColorScheme;
    setColorScheme: (value: MantineColorScheme) => void;
    clearColorScheme: () => void;
    toggleColorScheme: () => void;
}): string {
    const t2 = useMantineTheme();
    return theme.colorScheme === 'dark' ? 'white' : t2.colors.gray[7];
}