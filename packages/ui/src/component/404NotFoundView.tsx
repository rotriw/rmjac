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

export function NotFound({id} :any) {
    const { classes } = useStyles();

    return (
        <Container className={classes.root}>
            <div className={classes.label}>404</div>
            <Title className={classes.title}>#{id}的题单不存在</Title>
            <Text color="dimmed" size="lg" align="center" className={classes.description}>
                请再次确认。若您确定该题单存在，请及时反馈。
            </Text>
            <Group position="center">
                <Link to={'/'}><Button style={{textDecoration: 'none'}} size="md">
                    返回主页
                </Button></Link>
            </Group>
        </Container>
    );
}
