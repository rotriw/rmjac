import React, { useState } from 'react';
import {createStyles, Header, Container, Group, Burger, Button, Paper, Transition, Text} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {Link, NavLink} from "react-router-dom";
import {IconMoon, IconSun} from "@tabler/icons";

const useStyles = createStyles((theme) => ({
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '100%',

    },

    root: {
        position: 'relative',
        zIndex: 1,
    },

    dropdown: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        zIndex: 5,
        borderTopRightRadius: 0,
        borderTopLeftRadius: 0,
        borderTopWidth: 0,
        overflow: 'hidden',

        [theme.fn.largerThan('sm')]: {
            display: 'none',
        },
    },

    links: {
        [theme.fn.smallerThan('xs')]: {
            display: 'none',
        },
    },

    burger: {
        [theme.fn.largerThan('xs')]: {
            display: 'none',
        },
    },

    link: {
        display: 'block',
        lineHeight: 1,
        padding: '8px 12px',
        borderRadius: theme.radius.sm,
        textDecoration: 'none',
        color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.colors.gray[7],
        fontSize: theme.fontSizes.sm,
        fontWeight: 500,

        '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
        },
    },

    linkActive: {
        '&, &:hover': {
            backgroundColor: theme.fn.variant({ variant: 'light', color: theme.primaryColor }).background,
            color: theme.fn.variant({ variant: 'light', color: theme.primaryColor }).color,
        },
    },
}));

interface HeaderSimpleProps {
    links: { link: string; label: string }[];
    colorScheme: Function;
    colorSchemeData: string;
}

export function HeaderShowNew({ links, colorScheme, colorSchemeData }: HeaderSimpleProps) {
    const [opened, { toggle }] = useDisclosure(false);
    const [active, setActive] = useState(links[0].link);
    const { classes, cx } = useStyles();
    const items = links.map((item) => (
        <NavLink
            key={item.label}
            to={item.link}
            className={(state) => cx(classes.link, state.isActive ? classes.linkActive : '')}
        >
            {item.label}
        </NavLink>
    ));

	async function changeTheme() {
		colorScheme();
		await localStorage.setItem(`bgColor`, colorSchemeData === 'dark' ? 'light' : 'dark')
		let setItemEvent = new Event("changetheme");
		window.dispatchEvent(setItemEvent);
	}

    return (
        <Header height={60} mb={30}>
            <Container className={classes.header}>
                <Text weight={800}>RMJ.AC</Text>
                <Group spacing={5} className={classes.links}>
                    {items}
                    <a
                        href='#'
						onClick={(event) => { event.preventDefault();changeTheme()}}
                        className={classes.link}
                    >
                        设为{colorSchemeData === 'dark' ? '亮色' : '暗色'}模式
                    </a>
                </Group>
                <Burger opened={opened} onClick={toggle} className={classes.burger} size="sm" />
                <Transition transition="pop-top-right" duration={200} mounted={opened}>
                    {(styles) => (
                        <Paper className={classes.dropdown} withBorder style={styles}>
                            {items}
                            <a
                                href='#'
                                key='qwq'
                                onClick={(event)=>{event.preventDefault();colorScheme();localStorage.setItem(`bgColor`, colorSchemeData === 'dark' ? 'light' : 'dark')}}
                                className={classes.link}
                            >
                                设为{colorSchemeData === 'dark' ? '亮色' : '暗色'}模式
                            </a>
                        </Paper>
                    )}
                </Transition>
            </Container>
        </Header>
    );
}
