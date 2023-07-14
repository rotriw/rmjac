/* eslint-disable @typescript-eslint/no-unused-vars */
import { createStyles, Badge, Container, Space, Table, Grid } from '@mantine/core';
import React from 'react';
import { StandardCard } from '../components/card';
// import { BlockSuitEditor } from '../components/editor';
import {IconArrowLeft} from '@tabler/icons-react'

const useStyles = createStyles((theme) => ({
    
}));

export default function HomePage() {
    const { classes, cx, theme } = useStyles();
    const rows = (
        <>
            <tr>
                <td>测试公告</td>
                <td>2023.12.31</td>
            </tr>
        </>
    );
    return (
        <>
            <Container>
                <Grid>
                    <Grid.Col sm={12} xs={12} lg={9}>
                        <StandardCard title='公告列表'>
                            <Table>
                                <thead>
                                    <tr>
                                        <th style={{ width: '75%' }}>标题</th>
                                        <th>发布日期</th>
                                    </tr>
                                </thead>
                                <tbody>{rows}</tbody>
                            </Table>
                        </StandardCard>
                    </Grid.Col>
                    <Grid.Col sm={12} xs={12} lg={3}>
                        <StandardCard title='还不知道是什么'>996</StandardCard>
                    </Grid.Col>
                    <Space h='md' />
                </Grid>
            </Container>
        </>
    );
}
