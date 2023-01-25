import { createStyles, Title, Text, Button, Container, Group } from '@mantine/core';
import React from "react";
import {Link} from "react-router-dom";

const useStyles = createStyles((theme) => ({
    root: {
        paddingTop: 80,
        paddingBottom: 80,
    },

    label: {
        textAlign: 'center',
        fontWeight: 900,
        fontSize: 220,
        lineHeight: 1,
        marginBottom: theme.spacing.xl * 1.5,
        color: theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2],

        [theme.fn.smallerThan('sm')]: {
            fontSize: 120,
        },
    },

    title: {
        fontFamily: `Greycliff CF, ${theme.fontFamily}`,
        textAlign: 'center',
        fontWeight: 900,
        fontSize: 38,

        [theme.fn.smallerThan('sm')]: {
            fontSize: 32,
        },
    },

    description: {
        maxWidth: 500,
        margin: 'auto',
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.xl * 1.5,
    },
}));

export function NoAccess({id, perm} :any) {
    const { classes } = useStyles();

    return (
        <Container className={classes.root}>
            <div className={classes.label}>403</div>
            <Title className={classes.title}>您没有在#{id} {perm === 'view' ? '查看' : perm === 'perm' ? '权限管理' :  '编辑'} 权限。</Title>
            <Group position="center">
            </Group>
        </Container>
    );
}
