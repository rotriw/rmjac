import { PlatformToCNName, StandardProblemStatement, StatementToCNName } from 'rmjac-declare/problem';
import { Alert, Box, Button, Center, Code, Divider, Grid, Group, Input, NativeSelect, Space, Tabs, Text, Tooltip, useMantineTheme } from '@mantine/core';
import React from 'react';
import { NoStyleCard } from './card';
import { IconAlertCircle, IconArrowLeft, IconChevronsDown } from '@tabler/icons-react';
import { Editor } from '@monaco-editor/react';

interface SimpleShowProp {
    key: number | string;
    id: number | string;
    ind: string;
    out: string;
}

function ShowSimple({ id, ind, out }: SimpleShowProp) {
    const theme = useMantineTheme();
    return (
        <>
            <Text size={16} fw={600}>
                样例 #{id}
            </Text>
            <Space h={10}></Space>
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
                    <Space h={2}></Space>
                    <Code h={80} block style={{ backgroundColor: theme.colorScheme === 'dark' ? theme.colors?.dark[7] : theme.colors?.gray[1] }}>
                        {ind}
                    </Code>
                </div>
                <div>
                    <Grid>
                        <Grid.Col span={10}>
                            <Text size={14} fw={500}>
                                输出样例
                            </Text>
                        </Grid.Col>
                        <Grid.Col span={2}>
                            <Button fullWidth color='indigo' variant='light' compact size='xs'>
                                复制
                            </Button>
                        </Grid.Col>
                    </Grid>
                    <Space h={2}></Space>
                    <Code h={80} block style={{ backgroundColor: theme.colorScheme === 'dark' ? theme.colors?.dark[7] : theme.colors?.gray[1] }}>
                        {out}
                    </Code>
                </div>
            </Group>
            <Space h={15}></Space>
        </>
    );
}

export function ProblemStatementShow({ data }: { data: StandardProblemStatement }) {
    const items = data.showProp.map((id) => {
        const item = data[id] as string;
        if (id !== 'simples')
            return (
                <>
                    {/* deepscan-disable-line */}
                    <Text size={18} fw={600}>
                        {StatementToCNName[id] || id}
                    </Text>
                    <Space h={10}></Space>
                    <div dangerouslySetInnerHTML={{ __html: item || '' }}></div>
                    <Space h={20}></Space>
                </>
            );
        else {
            const res = ((item as unknown) as Array<{ in: string; out: string }>).map((item, index) => {
                return <ShowSimple key={index + 1} id={index + 1} ind={item.in} out={item.out} />;
            });
            return (
                <>
                    {' '}
                    {/* deepscan-disable-line */}
                    <Text size={18} fw={600}>
                        样例组
                    </Text>
                    <Space h={10} />
                    {res}
                    <Space h={20}></Space>
                </>
            );
        }
    });
    return <NoStyleCard>{items}</NoStyleCard>;
}

interface ProblemTitleProp {
    title: string;
    source: {
        platform: string;
        pid: string;
    }[];
    mode: string;
    setMode: (value: 'view' | 'submit') => void;
}

export function ProblemTitle({ title, source, mode, setMode }: ProblemTitleProp) {
    const theme = useMantineTheme();
    const sourceCode = source.map((item, index) => {
        return ` ${index === 0 ? '' : '/'} ${PlatformToCNName[item.platform] || item.platform} ${item.pid}`;
    });
    return (
        <NoStyleCard>
            <Text size={18} fw={600}>
                {title}
            </Text>
            <Space h={1}></Space>
            <Text size={13} fw={300} color={theme.colors.gray[theme.colorScheme === 'dark' ? 4 : 7]}>
                {sourceCode}
            </Text>
            <Space h={5} />
            {mode === 'view' ? (
                <>
                    <Button
                        variant={'filled'}
                        size={'xs'}
                        onClick={() => {
                            setMode('submit');
                        }}
                    >
                        远程提交
                    </Button>
                    &nbsp;
                    <Button variant={'light'} size={'xs'}>
                        保存至题单
                    </Button>
                </>
            ) : (
                <Button
                    variant={'light'}
                    size={'xs'}
                    onClick={() => {
                        setMode('view');
                    }}
                >
                    <IconArrowLeft size={14} /> &nbsp;返回题目
                </Button>
            )}
        </NoStyleCard>
    );
}

interface ProblemDescriptionProp {
    time: string;
    memory: string;
    difficult: {
        text: string;
        hint?: string;
        color: string;
    };
}

export function ProblemDescription({ time, memory, difficult }: ProblemDescriptionProp) {
    return (
        <NoStyleCard>
            <Group grow>
                <Box>
                    <Text tt='uppercase' fz='xs' c='dimmed' fw={700}>
                        时间限制
                    </Text>
                    <Group position='apart' align='flex-end' spacing={0}>
                        <Text size={14} fw={300}>
                            {time}
                        </Text>
                    </Group>
                </Box>
                <Box>
                    <Text tt='uppercase' fz='xs' c='dimmed' fw={700}>
                        空间限制
                    </Text>
                    <Group position='apart' align='flex-end' spacing={0}>
                        <Text size={14} fw={300}>
                            {memory}
                        </Text>
                    </Group>
                </Box>
                <Box>
                    <Text tt='uppercase' fz='xs' c='dimmed' fw={700}>
                        难度
                    </Text>
                    <Group position='apart' align='flex-end' spacing={0}>
                        {difficult.hint !== '' && difficult.hint !== undefined ? (
                            <Tooltip.Floating label='省选/NOI-'>
                                <Text size={14} fw={300} color={difficult.color}> {/*TODO: dark system */}
                                    {difficult.text}
                                </Text>
                            </Tooltip.Floating>
                        ) : (
                            <Text size={14} fw={300} color={difficult.color}>
                                {difficult.text}
                            </Text>
                        )}
                    </Group>
                </Box>
            </Group>
        </NoStyleCard>
    );
}

//TODO
export function SyncProblemSubmit() {
    
    return (<Tabs.Panel value="sync">
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
    </Tabs.Panel>);
}


//TODO
export function DirectProblemSubmit() {
    const theme = useMantineTheme();
    return (<Tabs.Panel value='direct'>
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
            您的帐号未配置 / 您可以点击 <span style={{color: theme.colorScheme === 'dark' ? theme.colors.blue[0] :  theme.colors.blue[8]}}>
        这里</span> 进行临时登录。
        </Text>
    </Alert>
    <Space h={5} />
    <Space h={20} />
    <Editor height={300}></Editor>
    <Space h={10} />
    <Button size={'xs'} className={'shadowButton'}>提交代码</Button>
    </Tabs.Panel>);
}

export function ProblemSubmit() {

}

// export function ShowCard() {

// }
