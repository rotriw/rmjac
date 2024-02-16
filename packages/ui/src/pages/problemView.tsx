import {
    createStyles,
    Box,
    Group,
    Container,
    Grid,
    Space,
    Text,
    Tabs,
    Modal,
    useMantineTheme, Card, Button, SegmentedControl
} from '@mantine/core';
import React, { useEffect, useState } from 'react';
import { NoStyleCard } from '../components/card';
import {
    IconExternalLink,
    IconHistory
} from '@tabler/icons-react';
import { PlatformToCNName, Problem } from 'rmjac-declare/problem';
import { DirectProblemSubmit, ProblemDescription, ProblemStatementShow, ProblemTitle, SyncProblemSubmit, TagCard } from '../components/problem';
import { useParams } from 'react-router-dom';
import { handleProblem } from '../handlers/problemHandler';
import { toast } from 'react-hot-toast';
import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/contrib/auto-render';
import { standardTab } from '../styles/select';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    const [submit, setSubmitMode] = useState('direct');
    const [statement, setStatement] = useState(data.version[data.defaultVersion]);
    const statementVersion = Object.keys(data.version).map((item) => {
        if (item !== data.defaultVersion)
            return (<Tabs.Tab key={item} value={item}>{PlatformToCNName[item] || item}</Tabs.Tab>)
        else
            return (<></>); {/* deepscan-disable-line */}
    })
    useEffect(() => {
        setStatement(data.version[data.defaultVersion]);
    }, [data]);
    useEffect(() => {
        renderMathInElement(document.body, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\(', right: '\\)', display: false},
                {left: '\\[', right: '\\]', display: true}
            ],
            throwOnError : false
        });
    }, [statement, mode]);
    const [uTab, setUTab] = useState(data.defaultVersion);
    const [opened, setOpened] = useState(false);
    const theme = useMantineTheme();
    const LeftGrid = mode === 'view' ? (<>
            <>
                <NoStyleCard>
                    <Card.Section p={'sm'} pl={15} mb={5}>
                        <Text size={16} fw={600}>{data.title}</Text>
                        <Text size={12} fw={400} color={'dimmed'}>时间限制: {data.limit.time} · 空间限制: {data.limit.memory} · 难度：{data.limit.difficult.text}</Text>
                    </Card.Section>
                    <ProblemStatementShow data={statement} />
                </NoStyleCard>
            </>
    </>) : (<>
        <Tabs onTabChange={(item) => {
            setSubmitMode(item as string)
        }} value={submit} variant={'pills'}>

            <NoStyleCard>
                <Card.Section p={'sm'} pl={15} mb={5}>
                    <Text size={16} fw={600}>{data.title}</Text>
                    <Text size={12} fw={400} color={'dimmed'}>时间限制: {data.limit.time} · 空间限制: {data.limit.memory} · 难度：{data.limit.difficult.text}</Text>
                </Card.Section>
                <Tabs.List>
                    <Tabs.Tab value="direct">{t('problem.directsubmit')}</Tabs.Tab>
                    <Tabs.Tab value="sync">{t('problem.syncsubmit')}</Tabs.Tab>
                </Tabs.List>
                <Space h={20}/>
                <DirectProblemSubmit />
                <SyncProblemSubmit />
            </NoStyleCard>
        </Tabs>
    </>);
    const RightGrid = (<>
            <SegmentedControl fullWidth
                data={[
                    { label: '题目详情', value: 'view' },
                    { label: '提交', value: 'submit' },
                ]}
                value={mode} onChange={(mode: string) => setMode(mode as 'view' | 'submit')}
            />
        <Space h={10}/>
        <NoStyleCard>
            <Modal withCloseButton={false} opened={opened} onClose={() => {setOpened(false)}} >
                <Text size={14} fw={600}>{t('Choose Version')}</Text>
                <Space h={10} />
                <Tabs.List>
                    <Tabs.Tab value={data.defaultVersion}>{PlatformToCNName[data.defaultVersion] || data.defaultVersion}</Tabs.Tab>
                    {statementVersion}
                </Tabs.List>
            </Modal>
            <Text fw={600} size={14}>当前展示版本为 {PlatformToCNName[uTab] || uTab}</Text>
            <Text fw={400} size={10} color='dimmed'>Version: Luogu / root. <a href='#change-version' style={{textDecoration: 'none', color: theme.colors.blue[9]}} onClick={() => {setOpened(true)}}>点击更换版本</a></Text>
        </NoStyleCard>
        <Space h={10} />
        {islogin ? <NoStyleCard p={'null'}>
            <Group p="sm" pl={'md'} grow>
                <Text color="dimmed" fw={700} size={'xs'}>
                    {t('problem.history-score')}
                </Text>
                <Text color="green" fw={700} size={'xs'}>
                    100
                </Text>
            </Group>

            <RightIcons links={[
                {
                    label: <div style={{alignItems: 'center', display: 'flex'}}><IconHistory size={15} stroke={1.5}></IconHistory>&nbsp;{t('problem.historysubmit')}
                    </div>, keys: 'send', order: 1, link: '#'
                },
                {
                    label: <div style={{alignItems: 'center', display: 'flex'}}><IconExternalLink size={15} stroke={1.5}></IconExternalLink>&nbsp;{t('problem.originlink')}
                    </div>, order: 1, keys: 're', link: '#'
                }, //alot of origin how to choose?
            ]} active={''}/>
        </NoStyleCard> : <NoStyleCard p={'null'}>

            <RightIcons links={[
                {
                    label: <div style={{alignItems: 'center', display: 'flex'}}><IconExternalLink size={15} stroke={1.5}></IconExternalLink>&nbsp;{t('problem.originlink')}
                    </div>, order: 1, keys: 're', link: '#'
                },
            ]} active={''}/>
        </NoStyleCard>}
    </>);
    return (
        <>
            <Container>
                <Tabs variant='pills' onTabChange={async(item) => {
                    setUTab(item as string)
                    await setStatement(data.version[item as string])
                }}  styles={standardTab} value={uTab}>
                <Grid>
                    <Grid.Col span={9}>
                        {LeftGrid}
                    </Grid.Col>
                    <Grid.Col span={3}>
                        {RightGrid}
                        <Space h={10}></Space>
                        <TagCard event={data.tags || []} algorithm={data.algorithm || []} />
                    </Grid.Col>
                </Grid>
                </Tabs>
            </Container>
        </>
    )
}

export function ProblemViewPage() {
    const param = useParams();
    const [pdata, setPdata] = useState<Problem>({
        tags: [{hint: 'NOIP2011提高组', id: 'NOIP2011TG', color: 'blue'}],
        algorithm: [{hint: '最短路', id: 'alogrithm1', color: 'dark'}],
        version: {
            'luogu': {
                samples: [{in: '4\naabbbb\ncccccc\naabaabaabaa\nbbaabaababaaba', out: '3\n5\n4\n7'}],
                showProp: ['statement', 'inFormer', 'outFormer', 'samples'],
                loading: 'loading..',
                statement: String.raw`如果一个字符串可以被拆分为 $\text{AABB}$ 的形式，其中 $\text{A}$ 和 $\text{B}$ 是任意 <strong>非空</strong> 字符串，则我们称该字符串的这种拆分是优秀的。  <br /> 例如，对于字符串 $ \texttt{aabaabaa} $ ，如果令 $\text{A}=\texttt{aab}$，$\text{B}=\texttt{a}$，我们就找到了这个字符串拆分成 $\text{AABB}$ 的一种方式。<br /> 一个字符串可能没有优秀的拆分，也可能存在不止一种优秀的拆分。  <br /> 比如我们令 $\text{A}=\texttt{a}$，$\text{B}=\texttt{baa}$，也可以用 $\text{AABB}$ 表示出上述字符串；但是，字符串 $\texttt{abaabaa}$ 就没有优秀的拆分。<br /> 现在给出一个长度为 $n$ 的字符串 $S$，我们需要求出，在它所有子串的所有拆分方式中，优秀拆分的总个数。这里的子串是指字符串中连续的一段。<br /> 以下事项需要注意：<br /> 1. 出现在不同位置的相同子串，我们认为是不同的子串，它们的优秀拆分均会被记入答案。<br />2. 在一个拆分中，允许出现 $\text{A}=\text{B}$。例如 $\texttt{cccc}$ 存在拆分 $\text{A}=\text{B}=\texttt{c}$。<br />3. 字符串本身也是它的一个子串。`,
                inFormer: '每个输入文件包含多组数据。<br /><br />输入文件的第一行只有一个整数 $T$，表示数据的组数。<br /><br />接下来 $T$ 行，每行包含一个仅由英文小写字母构成的字符串 $S$，意义如题所述。',
                outFormer: '输出 $T$ 行，每行包含一个整数，表示字符串 $S$ 所有子串的所有拆分中，总共有多少个是优秀的拆分。',
            },
            'ver2': {
                samples: [{in: '', out: 'Hello world!\nHere is rmj.ac'}],
                statement: '题目描述。',
                showProp: ['statement', 'samples'],
            }
        },
        defaultVersion: 'luogu',
        title: '优秀的拆分',
        sources: [{platform: 'luogu', pid: 'P1117'}],
        limit: {
            time: '1.00s',
            memory: '128MB',
            difficult: {
                text: '隐藏',
                color: '',
                hint: '测试prop'
            }
        }

    });
    const pid = param.pid || '';
    useEffect(() => {
        try {
            handleProblem(pid as string).then((res) => {
            if (res.status === 'success') {
                setPdata(res.data as Problem);
            } else {
                toast.error('题目查询错误。');
            }
        }) } catch(err) {
            toast.error('题目查询错误。');
        }
    }, [pid]);
        return (<ProblemViewPageIn data={pdata as unknown as Problem} state='view' islogin={window.web?.user?.status === 'ok'} />)
}
