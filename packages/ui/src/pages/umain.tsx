import React, {useEffect} from 'react';
import { useState } from 'react';
import {createStyles, Box, Text, Group, Grid, Container, useMantineTheme} from '@mantine/core';
import { IconListSearch } from '@tabler/icons';
import {Link, NavLink} from "react-router-dom";

const LINK_HEIGHT = 38;
const INDICATOR_SIZE = 10;
const INDICATOR_OFFSET = (LINK_HEIGHT - INDICATOR_SIZE) / 2;

const useStyles = createStyles((theme) => ({
    link: {
        ...theme.fn.focusStyles(),
        display: 'block',
        textDecoration: 'none',
        color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
        lineHeight: `${LINK_HEIGHT}px`,
        fontSize: theme.fontSizes.sm,
        height: LINK_HEIGHT,
        borderTopRightRadius: theme.radius.sm,
        borderBottomRightRadius: theme.radius.sm,
        borderLeft: `2px solid ${
            theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2]
        }`,

        '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
        },
    },

    linkActive: {
        fontWeight: 500,
        color: theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 3 : 7],
    },

    links: {
        position: 'relative',
    },

    indicator: {
        transition: 'transform 150ms ease',
        border: `2px solid ${theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 3 : 7]}`,
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
        height: INDICATOR_SIZE,
        width: INDICATOR_SIZE,
        borderRadius: INDICATOR_SIZE,
        position: 'absolute',
        left: -INDICATOR_SIZE / 2 + 1,
    },
}));

interface TableOfContentsFloatingProps {
    links: { label: string; link: string; order: number }[];
}

export function Table({ links }: TableOfContentsFloatingProps) {
    const { classes, cx } = useStyles();

    let ac = 0;
    const [active, setActive] = useState(0);
    const theme = useMantineTheme();
    const items = links.map((item, index) => (
        <NavLink
            to={item.link}
            key={item.label}
            onClick={(event) => {
                setActive(index);
            }}
            className={(state :any) => {if(state.isActive) {ac = index;} return cx(classes.link, state.isActive ? classes.linkActive : null)}}
            style={{ paddingLeft: item.order * theme.spacing.lg }}
        >
            {item.label}
        </NavLink>
    ));
    useEffect(()=> {
        setActive(ac);
    }, []);

    return (
        <div>
            <div className={classes.links}>
                <div
                    className={classes.indicator}
                    style={{ transform: `translateY(${active * LINK_HEIGHT + INDICATOR_OFFSET}px)` }}
                />
                {items}
            </div>
        </div>
    );
}


export function UMain() {
    let links = [
        {
            "label": "账号&绑定",
            "link": "/umain/account",
            "order": 1
        },
        {
            "label": "环境设置",
            "link": "/umain/env",
            "order": 1
        },
        {
            "label": "帮助",
            "link": "/umain/help",
            "order": 1
        },
    ]
    return (
        <Container>
            <Grid>
                <Grid.Col span={8}>
                    qwq
                </Grid.Col>
                <Grid.Col span={4}>
                    <Table links={links} ></Table>
                </Grid.Col>
            </Grid>
        </Container>
    )
}
