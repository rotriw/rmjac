import { PlatformToCNName, StandardProblemStatement, StatementToCNName } from 'rmjac-declare/problem';
import { Box, Button, Code, Group, Space, Text, Tooltip, useMantineTheme } from '@mantine/core';
import React from 'react';
import { NoStyleCard } from './card';
import { IconArrowLeft } from '@tabler/icons-react';

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
                样例# {id}
            </Text>
            <Space h={5}></Space>
            <Group grow>
                <div>
                    <Text size={14} fw={500}>
                        输入样例
                    </Text>
                    <Space h={2}></Space>
                    <Code block style={{ backgroundColor: theme.colorScheme === 'dark' ? theme.colors?.dark[7] : theme.colors?.gray[1] }}>
                        {ind}
                    </Code>
                </div>
                <div>
                    <Text size={14} fw={500}>
                        输出样例
                    </Text>
                    <Space h={2}></Space>
                    <Code block style={{ backgroundColor: theme.colorScheme === 'dark' ? theme.colors?.dark[7] : theme.colors?.gray[1] }}>
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
        if (item !== 'simples')
            return (
                <>
                    {' '}
                    {/* deepscan-disable-line */}
                    <Text size={18} fw={600}>
                        {StatementToCNName[item]}
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
                    <Space h={15} />
                    {res}
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

export function ProblemSubmit() {

}

// export function ShowCard() {

// }
