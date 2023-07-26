/* eslint-disable @typescript-eslint/no-unused-vars */
import { createStyles, Badge, Container, Space, Table, Text, Grid } from '@mantine/core';
import React from 'react';
import { NoStyleCard, StandardCard } from '../components/card';
// import { BlockSuitEditor } from '../components/editor';
import {IconArrowLeft} from '@tabler/icons-react'
import { Tab } from '@mantine/core/lib/Tabs/Tab/Tab';

const useStyles = createStyles((theme) => ({
    
}));

export default function HomePage() {
    const { classes, cx, theme } = useStyles();
    return (
        <>
            <Container>
                <Grid>
                    <Grid.Col sm={12} xs={12} lg={8}>
                        <NoStyleCard>
                            <Text fw={700} size={12}>Rmj.ac 现支持以下OJ</Text>
                            <Table>
                                <thead>
                                    <tr>
                                    <th style={{fontSize: 10}}>OJ名称</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                    <td>Luogu</td>
                                    </tr>
                                    <tr>
                                    <td>CodeForces</td>
                                    </tr>
                                </tbody>
                            </Table>
                        </NoStyleCard>
                    </Grid.Col>
                    <Grid.Col sm={12} xs={12} lg={4}>
                        <StandardCard title='倒计时'>996</StandardCard>
                    </Grid.Col>
                    <Space h='md' />
                </Grid>
            </Container>
        </>
    );
}
