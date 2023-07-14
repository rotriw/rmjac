/* eslint-disable @typescript-eslint/no-unused-vars */
import { createStyles, Header } from '@mantine/core';
import React from 'react';

const useStyles = createStyles((theme) => ({
    header: {
        // display: "flex",
        width: '100%',
        // justifyContent: "space-between",
        // alignItems: "center",
        textAlign: 'center',
        paddingTop: 30,
        paddingBottom: 30,
    },

    title: {
        fontWeight: 300,
        fontSize: theme.fontSizes.xl,
        margin: 'auto',
        marginBottom: 5,
    },

    subTitle: {
        fontWeight: 400,
        fontSize: theme.fontSizes.sm,
        margin: 'auto',
        color: theme.colors.gray[7],
    },
}));

interface HeadersProps {
    title: string;
    color: string;
    subTitle: string;
}

export function HeaderCard({ color, subTitle, title }: HeadersProps) {
    const { classes, cx } = useStyles();
    return (
        <div style={{ backgroundColor: color }} className={classes.header}>
            <div className={classes.title}>{title}</div>
            <div className={classes.subTitle}>{subTitle}</div>
        </div>
    );
}
