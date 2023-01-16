import React, {useEffect, useState} from "react";
import {Badge, Flex, Card, Container, Grid, Text, Group, Button, Center, Loader, useMantineTheme} from "@mantine/core";
import axios from "axios";
import {ShowList} from "../component/ShowList";
import {Link} from "react-router-dom";
import {completeNavigationProgress, NavigationProgress, setNavigationProgress} from "@mantine/nprogress";
import { IconPlus } from "@tabler/icons";

let times = 0;
let used = false;

async function InitPage(setData :Function, setOK :Function) {
    const baseurl = window.RMJ.baseurl;
    setNavigationProgress(0);
    let data = await axios.post(`${baseurl}list`, {
        'operation': 'show',
        'id': localStorage.getItem('uid'),
        'token': localStorage.getItem('token'),
    });
    completeNavigationProgress();
    setOK(true);
    setData(data.data.data);
}


export function HomePage({LoginStatus, baseurl} :any) {
    const [data, setData] = useState([]);
    const [ok, setOK] = useState(false);
	const theme = useMantineTheme();
    baseurl = baseurl;
    useEffect(() => {
        InitPage(setData, setOK);
    }, []);

    if (LoginStatus === true && ok ) {
        return (
            <Container>
                <Grid>
                    <Grid.Col span={12}>
                        {/* <div style={{padding: '5px'}}></div> */}
                        <Card withBorder style={{padding: '0px'}}>
                            <Card.Section withBorder inheritPadding py="xs" >
                                <Group position="apart" style={{padding: '16px', paddingBottom: '0px'}}>
									<Text weight={500}>我的题单</Text>
									<Flex
										gap='0'
										justify="flex-end"
										align="center"
										direction="row"
										wrap="wrap"
										>
										<IconPlus size={20} stroke={1.5} style={{color: theme.colors.indigo[5], textDecoration: 'none'}} /><Link to='/new' style={{color: theme.colors.indigo[5], textDecoration: 'none'}}>新建题单</Link>
									</Flex>
                                </Group>
                            </Card.Section>
                            <ShowList data={data} />
                        </Card>
                    </Grid.Col>
                </Grid>
            </Container>
        );
    } else {
        return (<Container style={{height: '100%'}}>
			<Center>Loading...</Center>
        </Container>);
    }
}
