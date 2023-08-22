import { EventTask } from 'rmjac-declare/event';
import React from 'react';
import { Container, Grid, Space, Table, Text, useMantineTheme } from '@mantine/core';
import { NoStyleCard } from '../components/card';
import { IconInfoCircle } from '@tabler/icons-react';

export function EventShow() {
    const theme = useMantineTheme();
    const data: EventTask = {
        id: 'NOIP2011TG',
        title: 'NOIP2011提高组',
        description: 'NOIP2011年练习题。',
        list: [{
            psid: 'P1000',
            title: '第一天第一题',
            hint: 'D1T1'
        }, {
            psid: 'P1001',
            title: '第一天第二题',
            hint: 'D1T2'
        }, {
            psid: 'P1002',
            title: '第一天第三题',
            hint: 'D1T3'
        }, {
            psid: 'P1003',
            title: '第二天第一题',
            hint: 'D2T1'
        }]
    }

    const rows = data.list.map((item) => (
        <tr key={item.psid}>
            <td width={'15%'} style={{color: theme.colors.gray[7], fontWeight: 600}} >{item.hint}</td>
            <td><span style={{fontWeight: 600}}>{item.psid}</span> {item.title}</td>
            <td></td>
        </tr>
    ));

    return (<>
        <Container>
            <Grid>
                <Grid.Col span={12}>
                    <NoStyleCard>
                        <Text size={18} fw={600}>
                            {data.title}
                        </Text>
                        <Space h={1}></Space>
                        <Text size={13} fw={300} color={theme.colors.gray[theme.colorScheme === 'dark' ? 4 : 7]}>
                            {data.id}
                        </Text>
                    </NoStyleCard>
                </Grid.Col>
            </Grid>
            <Grid>
                <Grid.Col span={4}>
                    <NoStyleCard>
                        <Text size={14} fw={400}>
                            <div dangerouslySetInnerHTML={{__html: data.description}}></div>
                        </Text>
                    </NoStyleCard>
                    <Space h={10} />
                    <NoStyleCard>
                        <Text size={14} fw={400}>
                            <span style={{fontWeight: 600}}>举行时间: </span>2011<br />
                            <span style={{fontWeight: 600}}>题目数: </span>6<br />
                            <span style={{fontWeight: 600}}>状态: </span>已结束<br />
                        </Text>
                    </NoStyleCard>
                    <Space h={10} />
                    <NoStyleCard>
                        <Text size={14} fw={600} color='blue' style={{
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <IconInfoCircle size={14} stroke={2} /> &nbsp;什么是event?
                        </Text>
                    </NoStyleCard>
                </Grid.Col>
                <Grid.Col span={8}>
                    <NoStyleCard>
                    <Table>
                        <thead>
                            <tr>
                                <th>题目顺序</th>
                                <th>题目</th>
                                <th>状态</th>
                            </tr>
                        </thead>
                        <tbody>{rows}</tbody>
                    </Table>
                    </NoStyleCard>
                </Grid.Col>
            </Grid>
        </Container>
    </>)
}