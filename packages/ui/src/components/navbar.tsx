/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from 'react';
import { createStyles, Header, Container, Group, Burger, Navbar as Navs, Transition, Paper, Menu, UnstyledButton, Avatar, rem, Text, Center } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { NavLink } from 'react-router-dom';
import React from 'react';
import { IconChevronDown, IconChevronRight, IconDashboard, IconHeart, IconLogout, IconMessage, IconPlayerPause, IconSettings, IconStar, IconSwitchHorizontal, IconTrash } from '@tabler/icons-react';

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
            paddingTop: 6,
            paddingBottom: 6,
            display: 'flex',
            alignItems: 'center',
            width: '100%',
        },
        [theme.fn.smallerThan('xs')]: {
            paddingTop: 6,
            paddingBottom: 6,
            display: 'flex',
            alignItems: 'center',
            width: '100%',
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

    user: {
        color: theme.colorScheme === 'dark' ? 'white' : theme.colors.gray[7],
        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
        borderRadius: theme.radius.sm,
        transition: 'background-color 100ms ease',

        '&:hover': {
            backgroundColor: theme.fn.lighten(
                theme.colorScheme === 'dark' ? theme.colors.gray[9] : theme.colors.gray[1],
                    0.1
                ),
            },

        [theme.fn.smallerThan('xs')]: {
            display: 'none',
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

    userActive: {
        backgroundColor: theme.fn.lighten(
            theme.colorScheme === 'dark' ? theme.colors.gray[9] : theme.colors.gray[1],
            0.1
        ),
    },

    Header: {
        // boxShadow: theme.shadows.sm,
        // border: n
        boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
        // position: 'relative',
        zIndex: 10,
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
    const [userMenuOpened, setUserMenuOpened] = useState(false);
    
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
        <Navs fixed={true}  position={{ top: 0, left: 0 }} height={50} top={'0 !important'} className={classes.Header} withBorder={false}>
            <Container className={classes.header}>
                <span className={classes.titleStyle}>{title}</span>
                <div style={{ padding: '2%' }}></div>
                <Group spacing={0} className={classes.links}>
                    {items}
                </Group>
                <div style={{ width: '100%', textAlign: 'right' }} className={classes.burger}>
                    <Burger opened={opened} onClick={toggle} className={classes.burger} size='sm' />
                </div>
                <div style={{marginLeft: 'auto'}}>
                    <Menu
                        width={250}
                        position="bottom-end"
                        transitionProps={{ transition: 'pop-top-right' }}
                        onClose={() => setUserMenuOpened(false)}
                        onOpen={() => setUserMenuOpened(true)}
                    >
                        <Menu.Target>
                        <UnstyledButton
                            className={cx(classes.user, { [classes.userActive]: userMenuOpened })}
                        >
                            <Group spacing={7}>
                                <Text weight={500} size="sm" sx={{ lineHeight: 1, color: theme.colorScheme === 'dark' ? 'white' : theme.colors.gray[7] }} mr={3}>
                                    测试账号
                                </Text>
                                <IconChevronDown size={rem(12)} stroke={1.5} />
                            </Group>
                        </UnstyledButton>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item rightSection={<IconChevronRight size="0.9rem" stroke={1.5} />} icon={<IconDashboard size="0.9rem" stroke={1.5} />}>
                                个人主页
                            </Menu.Item>
                            <Menu.Item rightSection={<IconChevronRight size="0.9rem" stroke={1.5} />} icon={<IconSettings size="0.9rem" stroke={1.5} />}>
                                账号设置
                            </Menu.Item>
                            <Menu.Divider />
                            <Menu.Item icon={<IconLogout size="0.9rem" stroke={1.5} />} color='red'>退出登录</Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </div>
                <Transition transition='pop-top-right' duration={200} mounted={opened}>
                    {(styles) => (
                        <Paper className={classes.dropdown} withBorder style={styles}>
                            {items}
                        </Paper>
                    )}
                </Transition>
            </Container>
        </Navs>
    );
}
