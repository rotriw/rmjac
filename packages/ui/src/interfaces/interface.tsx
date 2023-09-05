/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { IconCheck, IconX } from '@tabler/icons-react';
import { StandardCard } from '../components/card';
import React from 'react';
import { Alert, Button, Container, createStyles, Space, Text } from '@mantine/core';
import { t } from 'i18next';

const useStyles = createStyles((theme) => ({
    feedbackSuccess: {
        marginTop: -10,
        fontSize: '25px',
        color: theme.colors.green[6],
        paddingLeft: 1,
        fontWeight: 700,
    },
    feedbackError: {
        marginTop: -15,
        fontSize: '25px',
        color: theme.colors.red[6],
        paddingLeft: 1,
        fontWeight: 700,
    },
    feedbackIcon: {
        paddingTop: 7,
    },
}));

export function Blocked() {
    return (<>
        <Container>
            <StandardCard title='提示'>
                访问已被阻止。<br />
                权限不足。
                <Text color='dimmed' size={12}>若您无法做任何操作时, 请删除cookie后重试。</Text>
            </StandardCard> 
            { window?.web?.allowAppeal ? <>
                <Space h={10} />
                <StandardCard title='申诉'>
                    <Text color='green' size={14} fw={600}>对当前页面访问权限 允许申诉。</Text>

                </StandardCard> 
            </> :<></>}
        </Container>
    </>);
}

export function Feedback({ status, title, msg, links }: any) {
    const { classes, cx, theme } = useStyles();
    const link = (
        links as {
            link: string;
            title: string;
            color: string;
            style: string;
        }[]
    ).map((item) => (
        <a key={item.title} href={item.link}>
            <Button mr={4} color={item.color || 'indigo'} variant={item.style || 'filled'}>{item.title}</Button>
        </a>
    ));
    return (
        <Container>
            <StandardCard title='结果信息'>
                {status === 'success' ? (
                    <>
                        <Alert icon={<IconCheck size='1rem' />} title={title} color='green'>
                            {msg}
                        </Alert>
                    </>
                ) : (
                    <>
                        <Alert icon={<IconX size='1rem' />} title={title} color='red'>
                            {msg}
                        </Alert>
                    </>
                )}
                <Text pt={theme.spacing.xs}></Text>
                {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    link as any
                }
            </StandardCard>
        </Container>
    );
}
