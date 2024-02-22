/* eslint-disable @typescript-eslint/no-unused-vars */
import { Card, Group, Text, useMantineTheme, TextProps, CardProps } from '@mantine/core';
import React from 'react';
// import * as utils from '@mantine/utils';
// import { CardProps } from '@mantine/core';


export interface StandardCardProps extends CardProps {
    title?: string | React.ReactNode;
    content?: React.ReactNode;
    subtitle?: React.ReactNode;
    children?: React.ReactNode;
}

export interface NoStyleCardProps extends CardProps {
    content?: React.ReactNode;
}

export function StandardCard({ title, content, subtitle, children, ...props }: StandardCardProps) {
    return (
        <Card shadow='xs' p='md' radius='sm' {...props}>
            <Card.Section inheritPadding>
                <Group align='apart' mt='md' mb='xs'>
                    <Text>{title}</Text>
                    {subtitle}
                </Group>
            </Card.Section>
            {content || children}
        </Card>
    );
}

export function NoStyleCard({ content, children, ...props }: NoStyleCardProps) {
    return (
        <Card shadow='xs' p='md' radius='sm' {...props}>
            {children || content}
        </Card>
    );
}
