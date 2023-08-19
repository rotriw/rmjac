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
import React, { useEffect, useState } from 'react';
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
import { standardSelect, standardTab } from '../styles/select';
import {Prism} from '@mantine/prism';
import { PlatformToCNName, Problem, StandardProblemStatement } from 'rmjac-declare/problem';
import { DirectProblemSubmit, ProblemDescription, ProblemStatementShow, ProblemTitle, SyncProblemSubmit } from '../components/problem';
import { useParams } from 'react-router-dom';
import { handleProblem } from '../handlers/problemHandler';
import { toast } from 'react-hot-toast';

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

interface ProblemViewPage {
    data: Problem;
    islogin: boolean; 
    state: 'view' | 'submit';
}


export function ProblemViewPageIn({data, state, islogin}: ProblemViewPage) {
    const [mode, setMode] = useState(state);
    const [submit, setSubmitMode] = useState('direct');
    const [statement, setStatement] = useState(data.version[data.defaultVersion]);
    const statementVersion = Object.keys(data.version).map((item, index) => {
        if (item !== data.defaultVersion)
            return (<Tabs.Tab key={item} value={item}>{PlatformToCNName[item] || item}</Tabs.Tab>)
        else
            return (<></>); {/* deepscan-disable-line */}
    })
    console.log(statementVersion);
    const LeftGrid = mode === 'view' ? (<>
        <Tabs onTabChange={(item) => {
            setStatement(data.version[item as string])
        }} defaultValue={data.defaultVersion} styles={standardTab}>
            <NoStyleCard>
                <Tabs.List>
                    <Tabs.Tab value={data.defaultVersion}>{PlatformToCNName[data.defaultVersion] || data.defaultVersion}</Tabs.Tab>
                    {statementVersion}
                </Tabs.List>
            </NoStyleCard>
            <Space h={10}/>
            <ProblemStatementShow data={statement} />
        </Tabs>
    </>) : (<>
        <Tabs onTabChange={(item) => {
            setSubmitMode(item as string)
        }} value={submit} styles={standardTab}>
            <NoStyleCard>
                <Tabs.List>
                    <Tabs.Tab value="direct">直接提交</Tabs.Tab>
                    <Tabs.Tab value="sync">同步提交</Tabs.Tab>      
                </Tabs.List>
            </NoStyleCard>
            <Space h={10}/>
            <NoStyleCard>
                <DirectProblemSubmit />
                <SyncProblemSubmit />
            </NoStyleCard>
        </Tabs>
    </>);
    const RightGrid = (<>
        <ProblemDescription {...data.limit} />
        <Space h={10} />
        {islogin ? <NoStyleCard p={'null'}>
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
                    {label: <div style={{alignItems: 'center', display: 'flex'}}><IconExternalLink size={15} stroke={1.5}></IconExternalLink>&nbsp;原题链接</div>, order: 1, keys:'re',  link: '#'}, //alot of origin how to choose?
            ]} active={''} />
        </NoStyleCard> : <NoStyleCard p={'null'}>

            <RightIcons links={[
                    {label: <div style={{alignItems: 'center', display: 'flex'}}><IconExternalLink size={15} stroke={1.5}></IconExternalLink>&nbsp;原题链接</div>, order: 1, keys:'re',  link: '#'}, //alot of origin how to choose?
            ]} active={''} />
        </NoStyleCard>}
    </>);
    return (
        <>
            <Container>
                <Grid>
                    <Grid.Col span={9}>
                        <ProblemTitle setMode={setMode} title={data.title} source={data.sources} mode={mode} />
                        <Space h={10}></Space>
                        {LeftGrid}
                    </Grid.Col>
                    <Grid.Col span={3}>
                        {RightGrid}
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
    )
}

export function ProblemViewPage() {
    const param = useParams();
    const [pdata, setPdata] = useState<Problem>({
        version: {
            'default': {
                simples: [],
                showProp: ['loading'],
                loading: 'loading..'
            },
            'ver2': {
                simples: [{in: '无输入内容', out: 'Hello world!\nHere is rmj.ac'}],
                statement: '题目描述。',
                showProp: ['statement', 'simples'],
            }
        },
        defaultVersion: 'default',
        title: 'Loading...',
        sources: [],
        limit: {
            time: '-',
            memory: '-',
            difficult: {
                text: '-',
                color: '',
                hint: ''
            }
        }

    });
    const pid = param.pid || '';
    useEffect(() => {
        try {
            handleProblem(pid as string).then((res: any) => {
            if (res.status === 'success') {
                setPdata(pdata);
            } else {
                toast.error('题目查询错误。');
            }
        }) } catch(err) {
            toast.error('题目查询错误。');
        }
    }, [pid]);
    return (<ProblemViewPageIn data={pdata as unknown as Problem} state='view' islogin={window.web?.user?.status === 'ok'} />)
}
