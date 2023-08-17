import {
    createStyles,
    Box,
    Divider,
    Group,
    rem,
    Card,
    Container,
    Grid,
    Space,
    Text,
    Badge,
    Select,
    Button,
    useMantineTheme,
    Loader,
    Center,
    NativeSelect,
    Tooltip,
    Tabs, Input, Alert, Menu, Code
} from '@mantine/core';
import React, { useState } from 'react';
import { NoStyleCard, StandardCard } from '../components/card';
import {
    IconAlertCircle,
    IconBrandTelegram,
    IconCaretDown,
    IconChevronDown,
    IconClock,
    IconDatabase,
    IconExternalLink,
    IconHistory,
    IconLanguageHiragana,
    IconListSearch,
    IconMenuOrder,
    IconSend,
    IconChevronsDown,
    IconTransferIn, IconChevronsUp, IconArrowLeft
} from '@tabler/icons-react';
import Editor from '@monaco-editor/react';
import { standardSelect } from '../styles/select';
import {Prism} from '@mantine/prism';
import { Problem, StandardProblemStatement } from 'rmjac-declare/problem';
import { ProblemDescription, ProblemStatementShow, ProblemTitle } from '../components/problem';

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

export function ProblemViewPageIn({data, state}: {data: Problem, state: 'view' | 'submit'}) {
    const [mode, setMode] = useState(state);
    const LeftGrid = mode === 'view' ? (<>
        <ProblemStatementShow data={data.statement} />
    </>) : (<>
        
    </>);
    const RightGrid = (<>
        <ProblemDescription {...data.limit} />
    </>);
    return (
        <>
            <Container>
                <Grid>
                    <Grid.Col span={9}>
                        <ProblemTitle setMode={setMode} title='A+B Problem' source={[{platform: 'luogu', pid: 'P1000'}, {platform: 'codeforces', pid: '100A'}]} mode={mode} />
                        <Space h={10}></Space>
                        {LeftGrid}
                    </Grid.Col>
                    <Grid.Col span={3}>
                        {RightGrid}
                    </Grid.Col>
                </Grid>
            </Container>
        </>
    )
}

export function ProblemViewPage() {
    const theme = useMantineTheme();
    const [mode, setMode] = useState('view');
    return (
        <>
            <Container>
                <Grid>
                    <Grid.Col span={9}>
                        <ProblemTitle setMode={setMode} title='A+B Problem' source={[{platform: 'luogu', pid: 'P1000'}, {platform: 'codeforces', pid: '100A'}]} mode={mode} />
                        <Space h={10}></Space>
                        <Tabs onTabChange={(item) => {
                            console.log(item);
                        }} defaultValue="chat" styles={(theme) => ({
                                tab: {
                                    borderBottomWidth: 3,
                                    fontWeight: 700
                                },
                                tabsList: {
                                    borderBottomWidth: 0,
                                }
                        })}>
                            <NoStyleCard>
                                
                                <Tabs.List>
                                    <Tabs.Tab value="luogu">原版</Tabs.Tab>
                                    <Tabs.Tab value="cf">翻译</Tabs.Tab>  
                                    {/* <Tabs.Tab value="chat">直接提交</Tabs.Tab>
                                    <Tabs.Tab value="gallery">同步提交</Tabs.Tab> */}
                                    {/*<Tabs.Tab value="settings">存档</Tabs.Tab>*/}
                                </Tabs.List>
                            </NoStyleCard>
                            <Space h={10}/>
                            {/* <NoStyleCard>
                                <Tabs.Panel value="gallery">
                                    <Group>
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
                                                    label: 'smallfangddasdfsasdfaslfjadskl',
                                                    value: '99640',
                                                },
                                            ]}
                                            label='同步帐号'
                                            name='private'
                                            variant='filled'
                                            rightSection={<></>}
                                            rightSectionWidth={20}
                                        />
                                    </Group>
                                    <Space h={10} />
                                    <Button size={'xs'} className={'shadowButton'}>同步</Button>
                                    <Space h={5} />
                                    <div style={{display: 'none'}}><Divider my="xs" label={'通过提交记录同步'} labelPosition="center" />
                                    <Space  h={5} />
                                    <Group>
                                        <NativeSelect
                                            data={[
                                                {
                                                    label: '洛谷',
                                                    value: 'Luogu',
                                                }
                                            ]}
                                            label='平台'
                                            name='platform'
                                            description={'已通过的提交'}
                                            w={100}
                                            variant='filled'
                                            rightSection={<></>}
                                            rightSectionWidth={1}
                                        />
                                        <Input.Wrapper label="提交记录" description={'RID / link 均可'}>
                                            <Input w={300} variant={'filled'} placeholder={'数字 / 链接 / 字符串'}  />
                                        </Input.Wrapper>
                                    </Group>
                                    <Space h={10} />
                                    <Button size={'xs'} className={'shadowButton'}>同步</Button>
                                    </div>
                                    <Center style={{ alignItems: 'center', display: 'flex' }}><Text fw={700} color={'dimmed'} size={14} style={{ alignItems: 'center', display: 'flex' }}><IconChevronsDown stroke={2} size={14} ></IconChevronsDown>&nbsp;通过记录同步</Text></Center>
                                </Tabs.Panel>
                                <Tabs.Panel value="chat">
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
                                                    label: '公共帐号',
                                                    value: 'private',
                                                },
                                                {
                                                    label: 'smallfangddasdfsasdfaslfjadskl',
                                                    value: '99640',
                                                },
                                            ]}
                                            label='提交账号'
                                            name='private'
                                            variant='filled'
                                            rightSection={<></>}
                                            rightSectionWidth={20}
                                        />

                                    </Group>
                                    <Space h={10} />
                                    <Alert radius={'md'} icon={<IconAlertCircle size="1rem" />} title="提示" color="red">
                                        <Text size={12.5} color={theme.colorScheme === 'dark' ? theme.colors.red[0] :  theme.colors.red[8]}>
                                            您的帐号未配置 / 您可以点击 <span size={12.5} style={{color: theme.colorScheme === 'dark' ? theme.colors.blue[0] :  theme.colors.blue[8]}}>
                                        这里</span> 进行临时登录。
                                        </Text>
                                    </Alert>
                                    <Space h={5} />
                                    <Space h={20} />
                                    <Editor height={300}></Editor>
                                    <Space h={10} />
                                    <Button size={'xs'} className={'shadowButton'}>提交代码</Button>
                                </Tabs.Panel>
                            </NoStyleCard> */}

                        <NoStyleCard>
                            <Text size={18} fw={600}>
                                题目背景
                            </Text><Space h={10}></Space>
                            有一个

a×b 的整数组成的矩阵，现请你从中找出一个

n×n 的正方形区域，使得该区域所有数中的最大值和最小值的差最小。
                            <Space h={20}></Space>
                            <Text size={18} fw={600}>
                                样例组
                            </Text><Space h={15}></Space>
                            <Text size={16} fw={600}>
                                样例#1
                            </Text>
                            <Space h={5}></Space>
                            <Group grow>
                                <div>
                                    <Text size={14} fw={500}>
                                        输入样例
                                    </Text><Space h={2}></Space><Code block style={{backgroundColor: theme.colorScheme === 'dark' ? theme.colors?.dark[7] : theme.colors?.gray[1] }}>
                                    10 12
                                </Code></div>
                                <div><Text size={14} fw={500}>
                                    输出样例
                                </Text><Space h={2}></Space><Code block style={{backgroundColor: theme.colorScheme === 'dark' ? theme.colors?.dark[7] : theme.colors?.gray[1] }}>
                                    10 12
                                </Code></div>
                            </Group><Space h={15}></Space>
                            <Text size={16} fw={600}>
                                样例 #2
                            </Text>
                            <Space h={5}></Space>
                            <Group grow>
                                <div>
                                    <Grid>
                                        <Grid.Col span={10}>
                                            <Text size={14} fw={500}>
                                                输入样例
                                            </Text>
                                        </Grid.Col>
                                        <Grid.Col span={2}>
                                            <Button fullWidth color='indigo' variant='light' compact size='xs'>
                                                复制
                                            </Button>
                                        </Grid.Col>
                                    </Grid>
                                    <Space h={4}></Space><Code block style={{backgroundColor: theme.colorScheme === 'dark' ? theme.colors?.dark[7] : theme.colors?.gray[1] }}>
                                    10 12
                                </Code></div>
                                <div><Text size={14} fw={500}>
                                    输出样例
                                </Text><Space h={2}></Space><Code block style={{backgroundColor: theme.colorScheme === 'dark' ? theme.colors?.dark[7] : theme.colors?.gray[1] }}>
                                    10 12
                                </Code></div>
                            </Group>
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

                        </Tabs>


                    </Grid.Col>
                    <Grid.Col span={3}>

                    
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
                                    {label: <div style={{alignItems: 'center', display: 'flex'}}><IconExternalLink size={15} stroke={1.5}></IconExternalLink>&nbsp;原题链接</div>, order: 1, keys:'re',  link: '#'},
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
