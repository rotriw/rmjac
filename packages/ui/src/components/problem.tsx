import { PlatformToCNName, StandardProblemStatement, StatementToCNName, TagView } from 'rmjac-declare/problem';
import { Alert, Badge, Box, Button, Center, Code, Divider, Grid, Group, Input, NativeSelect, Space, Tabs, Text, Tooltip, TypographyStylesProvider, useMantineTheme } from '@mantine/core';
import React from 'react';
import { NoStyleCard, StandardCard } from './card';
import { IconAlertCircle, IconArrowLeft, IconChevronsDown } from '@tabler/icons-react';
import { Editor } from '@monaco-editor/react';
import { useToggle } from '@mantine/hooks';
import {t} from 'i18next';
import {useTranslation} from 'react-i18next';

interface SampleShowProp {
    key: number | string;
    id: number | string;
    ind: string;
    out: string;
}

function ShowSample({ id, ind, out }: SampleShowProp) {
    const theme = useMantineTheme();
    const {t} = useTranslation();
    return (
        <>
            <Text size={16} fw={600}>
                {t('problem.simple')} #{id}
            </Text>
            <Space h={10}></Space>
            <Group grow>
                <div>
                    <Grid>
                        <Grid.Col span={10}>
                            <Text size={14} fw={500}>
                                {t('problem.inSample')}
                            </Text>
                        </Grid.Col>
                        <Grid.Col span={2}>
                            <Button fullWidth color='indigo' variant='light' compact size='xs'>
                                {t('Copy')}
                            </Button>
                        </Grid.Col>
                    </Grid>
                    <Space h={2}></Space>
                    <Code h={80} block style={{ backgroundColor: theme.colorScheme === 'dark' ? theme.colors?.dark[7] : theme.colors?.gray[1] }}>
                        {ind || t('nocontent')}
                    </Code>
                </div>
                <div>
                    <Grid>
                        <Grid.Col span={10}>
                            <Text size={14} fw={500}>
                                {t('problem.outputSample')}
                            </Text>
                        </Grid.Col>
                        <Grid.Col span={2}>
                            <Button fullWidth color='indigo' variant='light' compact size='xs'>
                                {t('copy')}
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
        if (id !== 'samples') {
            if (item === '') {
                return (<></>) // deepscan-disable-line
            }
            return (
                <> {/* deepscan-disable-line */}
                    <Text size={16} fw={600}>
                        {StatementToCNName[id] || id}
                    </Text>
                    <Space h={5}></Space>
                    <TypographyStylesProvider fz={16}>
                        <div style={{color: '#424344'}} dangerouslySetInnerHTML={{__html: item || ''}}></div>
                    </TypographyStylesProvider>
                    <Space h={5}></Space>
                </>
            );
        } else {
            const res = ((item as unknown) as Array<{ in: string; out: string }>).map((item, index) => {
                return <ShowSample key={index + 1} id={index + 1} ind={item.in} out={item.out} />;
            });
            return (
                <> {/* deepscan-disable-line */}
                    <Text size={16} fw={600}>
                        {t('problem.simpleGroup')}
                    </Text>
                    <Space h={10} />
                    {res}
                    <Space h={20}></Space>
                </>
            );
        }
    });
    return <>{items}</>;
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
                        {t('problem.submit')}
                    </Button>
                    &nbsp;
                    <Button variant={'light'} size={'xs'}>
                        {t('problem.cph')}
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
                    <IconArrowLeft size={14} /> &nbsp;{t('problem.return')}
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

            <Box>
                <Text tt='uppercase' fz='xs' c='dimmed' fw={700}>
                    {t('problem.timelimit')}
                </Text>
                <Group position='apart' align='flex-end' spacing={0}>
                    <Text size={time.length >= 13 ? 10 : 12} fw={300}>
                        {time}
                    </Text>
                </Group>
            </Box>
            <Box>
                <Text tt='uppercase' fz='xs' c='dimmed' fw={700}>
                    {t('problem.memorylimit')}
                </Text>
                <Group position='apart' align='flex-end' spacing={0}>
                    <Text size={12} fw={300}>
                        {memory.length > 8 ? <Tooltip.Floating label={memory}>
                                <Text size={14} fw={300}>
                                    {memory.slice(0, 8)}...
                                </Text>
                            </Tooltip.Floating>
                            :
                            <>{memory}</>}
                    </Text>
                </Group>
            </Box>
            <Group grow>
                <Box>
                    <Text tt='uppercase' fz='xs' c='dimmed' fw={700}>
                        {t('problem.difficult')}
                    </Text>
                    <Group position='apart' align='flex-end' spacing={0}>
                        <Text size={12} fw={300} color={difficult.color}>
                            {difficult.text}
                        </Text>
                    </Group>
                </Box>
            </Group>
        </NoStyleCard>
    );
}

//TODO
export function SyncProblemSubmit() {
    // const {t} = useTranslation();
    return (<Tabs.Panel value="sync">
    <Group>
        <NativeSelect
            data={[
                {
                    label: t('platform.luogu'),
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
    <Button size={'xs'} className={'shadowButton'}>{t('sync')}</Button>
    <Space h={5} />
    <div style={{display: 'none'}}>
        <Divider my="xs" label={t('syncwithsubmission')} labelPosition="center" />
        <Space  h={5} />
        <Group>
                <NativeSelect
                    data={[
                        {
                            label: '洛谷',
                            value: 'Luogu',
                        }
                    ]}
                    label= {t('problem.platform')}
                    name='platform'
                    description={t('problem.whichac')}
                    w={100}
                    variant='filled'
                    rightSection={<></>}
                    rightSectionWidth={1}
                />
                <Input.Wrapper label={t('problem.submitID')} description={t('problem.submitByIDDescription')}>
                    <Input w={300} variant={'filled'} placeholder={'数字 / 链接 / 字符串'}  />
                </Input.Wrapper>
        </Group>
        <Space h={10} />
        <Button size={'xs'} className={'shadowButton'}>{t('sync')}</Button>
        </div>
        <Center style={{ alignItems: 'center', display: 'flex' }}><Text fw={700} color={'dimmed'} size={14} style={{ alignItems: 'center', display: 'flex' }}><IconChevronsDown stroke={2.4} size={15} ></IconChevronsDown>&nbsp;{t('syncwithsubmission')}</Text></Center>
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
    <Editor options={{
        scrollbar: {
            alwaysConsumeMouseWheel: false
        }
    }} height={300}></Editor>
    <Space h={10} />
    <Button size={'xs'} className={'shadowButton'}>提交代码</Button>
    </Tabs.Panel>);
}

interface TagCardProp {
    event: TagView[];
    algorithm: TagView[];
}

export function TagCard({event, algorithm}: TagCardProp) {
    const eventShow = event.map((item: TagView) => {
        return (
            <Badge key={item.id} size='sm' radius='xs' mr={5} color={item.color || 'blue'}>{item.hint || item.id}</Badge>
        )
    })
    const algorithmShow = algorithm.map((item: TagView) => {
        return (
            <Badge key={item.id} size='sm' radius='xs' mr={5} color={item.color || 'blue'}>{item.hint || item.id}</Badge>
        )
    })
    const [showAlgorithm, setStatusAlgorithm]: readonly['close' | 'show', (val?: 'close' | 'show') => void] = useToggle(['close', 'show']);
    return (<StandardCard title={t('Category')}>
        {eventShow}
        {showAlgorithm === 'show' ? algorithmShow : <></>}
        <Space h={5} />
        <Center><Button onClick={() => {setStatusAlgorithm()}} size='xs' variant="subtle" color="gray" compact>{t('problem.algorithm',{status: showAlgorithm === 'show' ? t('Collapse') : t('Expand')})}</Button></Center>
    </StandardCard>);
}

// export function ProblemSubmit() {

// }

// export function ShowCard() {

// }
