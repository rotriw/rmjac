import { MantineTheme } from '@mantine/core';

export const standardSelect = (theme: MantineTheme) => ({
    item: {
        '&[data-selected]': {
            '&, &:hover': {
                backgroundColor: theme.colorScheme === 'dark' ? `${theme.colors.indigo[9]}55` : theme.colors.indigo[0],
                color: theme.colorScheme === 'dark' ? theme.white : theme.colors.indigo[9],
            },
        },
        '&[data-hovered]': {},
    },
});
