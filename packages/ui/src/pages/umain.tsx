import React, {useEffect} from 'react';
import { useState } from 'react';
import {createStyles, Box, Text, Group, Grid, Container, useMantineTheme, Button, Input} from '@mantine/core';
import {IconCheck, IconListSearch} from '@tabler/icons';
import {Link, NavLink} from "react-router-dom";
import axios from "axios";
import {showNotification, updateNotification} from "@mantine/notifications";
import {ShowHeaders} from "../component/viewheader";
import {useToggle} from "@mantine/hooks";
import {ConnectAccount} from "../component/connectAccount";

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
        borderTopLeftRadius: theme.radius.sm,
        borderBottomLeftRadius: theme.radius.sm,
        borderRight: `2px solid ${
            theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2]
        }`,
        '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
        },
    },

    linkActive: {
        fontWeight: 500,
        // backgroundColor: theme.colors.indigo[0],
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
        right: -INDICATOR_SIZE / 2 + 1,
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

async function updateLuogu(id :string | null, token :string | null, setLoad :() => void) {

    await axios.post(`${window.RMJ.baseurl}umain`, {
        'operation': 'updateLuogu',
        id,
        token,
    });
    setLoad();
}


export function UMain() {
    const [loadding, setload] = useToggle([false, true]);
    const links = [
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
    ]
    return (
        <>
            <ShowHeaders  headerName={'个人中心'} description={`UID: ${localStorage.getItem('uid')}`} tabs={[]}/>
            <Container>
                <Grid>
                    <Grid.Col span={3}>
                        <Table links={links} ></Table>
                    </Grid.Col>
                    <Grid.Col span={1}>
                    </Grid.Col>
                    <Grid.Col span={8}>
                        <Input.Wrapper label={'更新数据'} description={'更新前请您确保已关闭完全隐私权限。'}>
                            <div style={{marginTop: 8}} />
                            <Button
                                loading={loadding}
                                onClick={() => {
                                    setload();updateLuogu(localStorage.getItem('uid'), localStorage.getItem('token'), setload);
                            }}>更新</Button>
                        </Input.Wrapper>
                        <br />
                        <Input.Wrapper label={'退出登录'}  description={'重设您的登陆状态，并跳转回登录页。'}>
                            <div style={{marginTop: 2}} />
                            <Button color={'red'} onClick={() => {
                                localStorage.setItem('setting-user-login', 'false');window.location.href=`/login`
                            }}>退出登录 / 重新登录</Button>
                        </Input.Wrapper>
                        <br />
                        <ConnectAccount data={[{'type': 'luogu', 'UID': '先不急 还没写'}]} />
                    </Grid.Col>
                </Grid>
            </Container>
        </>
    )
}
