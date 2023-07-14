/* eslint-disable @typescript-eslint/no-unused-vars */
import { Card, Group, Text, useMantineTheme, createStyles, TextProps } from '@mantine/core';
import React from 'react';
import * as utils from '@mantine/utils';
import { PaperProps } from '@mantine/core';

const useStyles = createStyles((theme) => ({
    standardCard: {
        fontWeight: 700,
        color: theme.colors.gray[5],
        fontSize: 12.5,
    },
}));

export interface StandardCardProps extends PaperProps {
    title?: string | React.ReactNode;
    content?: React.ReactNode;
    subtitle?: React.ReactNode;
}

export interface NoStyleCardProps extends PaperProps {
    content?: React.ReactNode;
}

export function StandardCard({ title, content, subtitle, children, ...props }: StandardCardProps) {
    const { classes, cx, theme } = useStyles();
    return (
        <Card shadow='xs' p='md' radius='sm' {...props}>
            <Card.Section inheritPadding>
                <Group position='apart' mt='md' mb='xs'>
                    <Text className={classes.standardCard}>{title}</Text>
                    {subtitle}
                </Group>
            </Card.Section>
            {content || children}
        </Card>
    );
}

export function NoStyleCard({ content, children, ...props }: NoStyleCardProps) {
    const { classes, cx, theme } = useStyles();
    return (
        <Card shadow='xs' p='md' radius='sm' {...props}>
            {children || content}
        </Card>
    );
}
