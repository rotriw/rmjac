import { createStyles, Box, Group, rem, Card, Container, Grid, Space, Text, Badge, Select, Button, useMantineTheme, Loader, Center, NativeSelect, Tooltip } from '@mantine/core';
import React from 'react';
import { NoStyleCard, StandardCard } from '../components/card';
import { IconBrandTelegram, IconCaretDown, IconChevronDown, IconClock, IconDatabase, IconExternalLink, IconHistory, IconLanguageHiragana, IconListSearch, IconMenuOrder, IconSend, IconTransferIn } from '@tabler/icons-react';
import Editor from '@monaco-editor/react';
import { standardSelect } from '../styles/select';

const useStyles = createStyles((theme) => ({
    link: {
        ...theme.fn.focusStyles(),
        display: 'block',
        textDecoration: 'none',
        color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
        lineHeight: 1.2,
        fontSize: theme.fontSizes.sm,
        padding: theme.spacing.sm,
        borderTopRightRadius: theme.radius.sm,
        borderBottomRightRadius: theme.radius.sm,
        // borderLeft: `${rem(0)} solid ${theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[3]}`,
        borderLeftColor: theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 6 : 7],
        '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : `${theme.colors.gray[0]}`,
        },
    },

    linkActive: {
        fontWeight: 500,
        borderLeftColor: theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 6 : 7],
        color: theme.colors[theme.primaryColor][theme.colorScheme === 'dark' ? 2 : 7],

        '&, &:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.fn.rgba(theme.colors[theme.primaryColor][9], 0.25) : theme.colors[theme.primaryColor][0],
        },
    },
}));

interface TableOfContentsProps {
    links: { keys: string, label: JSX.Element[] | JSX.Element | string; link: string; order: number }[];
    active: string;
}

export function RightIcons({ links, active }: TableOfContentsProps) {
    const { classes, cx } = useStyles();
    const items = links.map((item) => (
        <Box<'a'>
            component='a'
            href={item.link}
            onClick={(event) => event.preventDefault()}
            key={item.keys}
            className={cx(classes.link, { [classes.linkActive]: active === item.link })}
            sx={(theme) => ({ paddingLeft: `calc(${item.order} * ${theme.spacing.md})` })}
        >
            {item.label}
        </Box>
    ));

    return (
        <div>
            {items}
        </div>
    );
}

export function ProblemViewPage() {
    const theme = useMantineTheme();
    return (
        <>
            <Container>
                <Grid>
                    <Grid.Col span={9}>
                        <NoStyleCard>
                            <Text size={18} fw={600}>
                                    直角三角形
                            </Text>
                            <Space h={1}></Space>
                            <Text size={13} fw={300} color={theme.colors.gray[theme.colorScheme === 'dark' ? 4 : 7]}>
                                洛谷 P2216
                            </Text>
                        </NoStyleCard>
                        <Space h={10}></Space>
                        <NoStyleCard>   
                            <Text size={18} fw={600}>
                                题目背景
                            </Text><Space h={10}></Space>
                            有一个 

a×b 的整数组成的矩阵，现请你从中找出一个 

n×n 的正方形区域，使得该区域所有数中的最大值和最小值的差最小。
                            <Space h={20}></Space>
                            <Text size={18} fw={600}>
                                题目描述
                            </Text><Space h={10}></Space>
                            有一个 

a×b 的整数组成的矩阵，现请你从中找出一个 

n×n 的正方形区域，使得该区域所有数中的最大值和最小值的差最小。
                            <Space h={20}></Space>
                            <Text size={18} fw={600}>
                                输入格式
                            </Text><Space h={10}></Space>
                            一行两个整数A, B<Space h={20}></Space>
                            <Text size={18} fw={600}>
                                输出格式
                            </Text><Space h={10}></Space>
                            一个整数C, 表示A+B
                        </NoStyleCard>
                        <Space h={10}></Space>
                        <NoStyleCard>
                            <Text size={18} fw={600}>
                                提交代码
                            </Text><Space h={10}></Space>
                            <Group>
                            <NativeSelect
                                data={[
                                    {
                                        label: 'C++',
                                        value: 'cpp',
                                    },
                                    {
                                        label: 'C',
                                        value: 'c',
                                    },
                                    {
                                        label: 'Java',
                                        value: 'java',
                                    },
                                ]}
                                label='语言'
                                name='language'
                                w={100}
                                variant='filled'
                                rightSection={<></>}
                                rightSectionWidth={1}
                            />
                            <NativeSelect
                                data={[
                                    {
                                        label: '洛谷',
                                        value: 'Luogu',
                                    }
                                ]}
                                label='平台'
                                name='platform'
                                w={100}
                                variant='filled'
                                rightSection={<></>}
                                rightSectionWidth={1}
                            />
                            <NativeSelect
                                data={[
                                    {
                                        label: '公用账号',
                                        value: 'public',
                                    },
                                    {
                                        label: '私有账号',
                                        value: 'private',
                                    },
                                ]}
                                label='方式'
                                name='language'
                                w={100}
                                variant='filled'
                                rightSection={<></>}
                                rightSectionWidth={1}
                            />
                            </Group>
                            <Space h={20} />
                            <Editor loading={<Loader></Loader>} theme={theme.colorScheme === 'dark' ? 'vs-dark' : 'light'} language='cpp' height={500}></Editor>
                            <Space h={10} />
                            <Button radius={'xl'} >提交代码</Button>
                        </NoStyleCard>
                    </Grid.Col>
                    <Grid.Col span={3}>

                    <NoStyleCard>
                            <Group grow>
                                <Box>
                                    <Text tt="uppercase" fz="xs" c="dimmed" fw={700}>
                                        时间限制
                                    </Text>
                                    <Group position="apart" align="flex-end" spacing={0}>
                                        <Text size={14} fw={300} >1.0s~3.0s</Text>
                                    </Group>
                                </Box>
                                <Box>
                                    <Text tt="uppercase" fz="xs" c="dimmed" fw={700}>
                                        空间限制
                                    </Text>
                                    <Group position="apart" align="flex-end" spacing={0}>
                                        <Text size={14} fw={300}>1GB</Text>
                                    </Group>
                                </Box>
                                <Box>
                                    <Text tt="uppercase" fz="xs" c="dimmed" fw={700}>
                                        难度
                                    </Text>
                                    <Group position="apart" align="flex-end" spacing={0}>
                                        <Tooltip.Floating label="省选/NOI-" >
                                            <Text size={14} fw={300} color='darkblue'>Luogu/7</Text>
                                        </Tooltip.Floating>
                                    </Group>
                                </Box>
                            </Group>
                        </NoStyleCard>
                        <Space h={10}></Space>
                        <NoStyleCard p={'null'}> 
                            <Group p='sm' pl={'md'} grow>
                                <Text color='dimmed' fw={700} size={'xs'}>
                                    历史得分
                                </Text>
                                <Text color='green' fw={700} size={'xs'}>
                                    100
                                </Text>
                            </Group>

                            <RightIcons links={[
                                    {label: <div style={{alignItems: 'center', display: 'flex'}}><IconHistory size={15} stroke={1.5}></IconHistory>&nbsp;历史提交</div>, keys:'send', order: 1, link: '#'},
                                ]} active={''} />
                        </NoStyleCard>
                        <Space h={10}></Space>
                        <NoStyleCard p={'null'}>
                            <RightIcons links={[
                                {label: <div style={{alignItems: 'center', display: 'flex'}}><IconBrandTelegram size={15} stroke={1.5}></IconBrandTelegram>&nbsp;远程提交</div>, keys:'send', order: 1, link: '#'},
                                {label: <div style={{alignItems: 'center', display: 'flex'}}><IconExternalLink size={15} stroke={1.5}></IconExternalLink>&nbsp;原题连接</div>, order: 1, keys:'re',  link: '#'},
                                {label: <div style={{alignItems: 'center', display: 'flex'}}><IconTransferIn size={15} stroke={1.5}></IconTransferIn>&nbsp;保存至题单</div>, order: 1, keys:'save',  link: '#'},
                                {label: <div style={{alignItems: 'center', display: 'flex'}}><IconLanguageHiragana size={15} stroke={1.5}></IconLanguageHiragana>&nbsp;查看翻译</div>, order: 1, keys:'save',  link: '#'},
                            ]} active={''} />
                        </NoStyleCard>
                        <Space h={10}></Space>
                        <StandardCard title='分类'> 
                        <Badge size='sm' radius='xs'>NOIP</Badge>
                        <Space h={5} />
                        <Center><Button size='xs' variant="subtle" color="gray" compact>展开算法标签</Button></Center>
                        </StandardCard>
                    </Grid.Col>
                </Grid>
            </Container>
        </>
    );
}
