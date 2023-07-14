/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react';
import { createStyles, Header, Container, Group, Burger, Transition, Paper } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { NavLink } from 'react-router-dom';
import React from 'react';

const useStyles = createStyles((theme) => ({
    header: {
        display: 'flex',
        //  justifyContent: "space-between",
        alignItems: 'center',
        height: '100%',
        width: '100%',
        borderBottom: 'none !important',
    },

    links: {
        height: '100%',
        [theme.fn.smallerThan('xs')]: {
            display: 'none',
        },
    },

    burger: {
        color: theme.colors.gray[7],
        [theme.fn.largerThan('xs')]: {
            display: 'none',
        },
    },

    link: {
        display: 'flex',
        alignItems: 'center',
        height: '100%',
        paddingLeft: theme.spacing.md,
        paddingRight: theme.spacing.md,
        textDecoration: 'none',
        color: theme.colorScheme === 'dark' ? theme.white : theme.colors.gray[7],
        fontWeight: 500,
        fontSize: theme.fontSizes.sm,

        [theme.fn.smallerThan('sm')]: {
            // height: rem(42),
            // display: 'flex',
            // alignItems: 'center',
            // width: '100%',
        },
        [theme.fn.smallerThan('xs')]: {
            // height: rem(42),
            // display: 'flex',
            // alignItems: 'center',
            // width: '100%',
        },

        ...theme.fn.hover({
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
        }),
    },

    linkActive: {
        '&, &:hover': {
            color: theme.colors.blue[8],
        },
    },

    titleStyle: {
        fontWeight: 700,
        color: theme.colorScheme === 'dark' ? 'white' : theme.colors.gray[7],
        [theme.fn.smallerThan('xs')]: {
            width: '150px',
        },
    },

    dropdown: {
        position: 'absolute',
        top: '50px',
        left: 0,
        right: 0,
        borderRadius: theme.radius.xs,
        zIndex: 0,
        borderTopRightRadius: 0,
        borderTopLeftRadius: 0,
        borderTopWidth: 0,
        overflow: 'hidden',

        [theme.fn.largerThan('sm')]: {
            display: 'none',
        },
    },

    Header: {
        // boxShadow: theme.shadows.sm,
        // border: n
        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
        position: 'relative',
        zIndex: 1,
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : 'white',
    },
}));

interface HeadersProps {
    links: { link: string; label: string }[];
    title: string;
    type: 'route' | 'direct';
}

export function Navbar({ links, title, type }: HeadersProps) {
    const [opened, { toggle }] = useDisclosure(false);
    const { classes, cx, theme } = useStyles();
    
    const items =
        type === 'route'
            ? links.map((item) => (
                <NavLink key={item.label} to={item.link} className={(state) => cx(classes.link, state.isActive ? classes.linkActive : '')}>
                    {item.label}
                </NavLink>
            ))
            : links.map((item) => (
                <a key={item.label} href={item.link} className={classes.link} >
                    {item.label}
                </a>
            ));

    return (
        <Header height={50} mb={0} className={classes.Header} withBorder={false}>
            <Container className={classes.header}>
                <span className={classes.titleStyle}>{title}</span>
                <div style={{ padding: '2%' }}></div>
                <Group spacing={0} className={classes.links}>
                    {items}
                </Group>
                <div style={{ width: '100%', textAlign: 'right' }} className={classes.burger}>
                    <Burger opened={opened} onClick={toggle} className={classes.burger} size='sm' />
                </div>
                <Transition transition='pop-top-right' duration={200} mounted={opened}>
                    {(styles) => (
                        <Paper className={classes.dropdown} withBorder style={styles}>
                            {items}
                        </Paper>
                    )}
                </Transition>
            </Container>
        </Header>
    );
}
