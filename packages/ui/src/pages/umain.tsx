import React, {useEffect} from 'react';
import { useState } from 'react';
import {createStyles, Box, Text, Group, Grid, Container, useMantineTheme, Button} from '@mantine/core';
import {IconCheck, IconListSearch} from '@tabler/icons';
import {Link, NavLink} from "react-router-dom";
import axios from "axios";
import {showNotification, updateNotification} from "@mantine/notifications";

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
    const theme = useMantineTheme();
    const [active, setActive] = useState(0);
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

async function updateLuogu(id :string | null, token :string | null) {
    showNotification({
        id: `new-data`,
        disallowClose: false,
        onClose: () => {},
        onOpen: () => {},
        title: `已提交更新`,
        message: (<div>正在获取您的通过情况。</div>),
        color: 'indigo',
        icon: <IconCheck />,
        className: 'login-notification-class',
        loading: true,
        autoClose: false,
    })
    await axios.post(`${window.RMJ.baseurl}umain`, {
        'operation': 'updateLuogu',
        id,
        token,
    });
    updateNotification({
        id: `new-data`,
        disallowClose: false,
        onClose: () => {},
        onOpen: () => {},
        title: `已完成更新`,
        message: (<div>已更新您当前通过情况。</div>),
        color: 'indigo',
        icon: <IconCheck />,
        className: 'login-notification-class',
        loading: false,
        autoClose: false,
    })
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
                <Grid.Col span={12}>
                    <Button fullWidth onClick={() => {
                        updateLuogu(localStorage.getItem('uid'), localStorage.getItem('token'));
                    }}>更新您在洛谷的通过数据</Button>
                    更新前请您确保已关闭完全隐私权限。<br /><br /><br />

                    <Button color={'red'} fullWidth onClick={() => {
                        localStorage.setItem('setting-user-login', 'false');window.location.href=`/login`
                    }}>退出登录 / 重新登录</Button>
                </Grid.Col>
                {/*<Grid.Col span={4}>*/}
                {/*    <Table links={links} ></Table>*/}
                {/*</Grid.Col>*/}
            </Grid>
        </Container>
    )
}
