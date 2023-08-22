import {
    createStyles,
    Box,
    Group,
    Container,
    Grid,
    Space,
    Text,
    Tabs
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
    const statementVersion = Object.keys(data.version).map((item) => {
        if (item !== data.defaultVersion)
            return (<Tabs.Tab key={item} value={item}>{PlatformToCNName[item] || item}</Tabs.Tab>)
        else
            return (<></>); {/* deepscan-disable-line */}
    })
    useEffect(() => {
        // console.log('done');
        renderMathInElement(document.body, {
            // customised options
            // • auto-render specific keys, e.g.:
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\(', right: '\\)', display: false},
                {left: '\\[', right: '\\]', display: true}
            ],
            // • rendering keys, e.g.:
            throwOnError : false
        });
    }, [statement, mode]);
    // console.log(statementVersion);
    const LeftGrid = mode === 'view' ? (<>
        <Tabs onTabChange={async(item) => {
            await setStatement(data.version[item as string])
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
                        <TagCard event={data.tags || []} algorithm={data.algorithm || []} />
                    </Grid.Col>
                </Grid>
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
                simples: [{in: '4\naabbbb\ncccccc\naabaabaabaa\nbbaabaababaaba', out: '3\n5\n4\n7'}],
                showProp: ['statement', 'inFormer', 'outFormer', 'simples'],
                loading: 'loading..',
                statement: String.raw`如果一个字符串可以被拆分为 $\text{AABB}$ 的形式，其中 $\text{A}$ 和 $\text{B}$ 是任意 <strong>非空</strong> 字符串，则我们称该字符串的这种拆分是优秀的。  <br /> <br />例如，对于字符串 $ \texttt{aabaabaa} $ ，如果令 $\text{A}=\texttt{aab}$，$\text{B}=\texttt{a}$，我们就找到了这个字符串拆分成 $\text{AABB}$ 的一种方式。<br /> <br />一个字符串可能没有优秀的拆分，也可能存在不止一种优秀的拆分。  <br /> <br />比如我们令 $\text{A}=\texttt{a}$，$\text{B}=\texttt{baa}$，也可以用 $\text{AABB}$ 表示出上述字符串；但是，字符串 $\texttt{abaabaa}$ 就没有优秀的拆分。<br /> <br />现在给出一个长度为 $n$ 的字符串 $S$，我们需要求出，在它所有子串的所有拆分方式中，优秀拆分的总个数。这里的子串是指字符串中连续的一段。<br /> <br />以下事项需要注意：<br /> <br />1. 出现在不同位置的相同子串，我们认为是不同的子串，它们的优秀拆分均会被记入答案。<br />2. 在一个拆分中，允许出现 $\text{A}=\text{B}$。例如 $\texttt{cccc}$ 存在拆分 $\text{A}=\text{B}=\texttt{c}$。<br />3. 字符串本身也是它的一个子串。`,
                inFormer: '每个输入文件包含多组数据。<br /><br />输入文件的第一行只有一个整数 $T$，表示数据的组数。<br /><br />接下来 $T$ 行，每行包含一个仅由英文小写字母构成的字符串 $S$，意义如题所述。',
                outFormer: '输出 $T$ 行，每行包含一个整数，表示字符串 $S$ 所有子串的所有拆分中，总共有多少个是优秀的拆分。',
            },
            'ver2': {
                simples: [{in: '无输入内容', out: 'Hello world!\nHere is rmj.ac'}],
                statement: '题目描述。',
                showProp: ['statement', 'simples'],
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