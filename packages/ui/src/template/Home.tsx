import React, {useEffect, useState} from "react";
import {Badge, Card, Container, Grid, Text, Group, Button} from "@mantine/core";
import axios from "axios";
import {ProblemList} from "../component/ProblemList";
import {Link} from "react-router-dom";
import {completeNavigationProgress, NavigationProgress, setNavigationProgress} from "@mantine/nprogress";


let times = 0;

async function InitPage(setData :Function) {
    let baseurl = `http://localhost:8000/`;
    console.log('qwqxw');
    setNavigationProgress(50);
    let data = await axios.post(`${baseurl}list`, {
        'operation': 'show',
        'id': localStorage.getItem('uid'),
        'token': localStorage.getItem('token'),
    });
    completeNavigationProgress();
    ok = true;
    console.log('qwqx');
    setData(data.data.data);
    console.log(data.data.data);
}

let used = false, ok = false;

export function HomePage({LoginStatus} :any) {
    console.log('qwq');
    const [data, setData] = useState([]);
    useEffect(() => {
        InitPage(setData);
    }, []);

    if (LoginStatus === true && ok) {
        return (
            <Container>
                <Grid>
                    <Grid.Col span={12}>
                        <Link to={'/new'}><Button>新建一个题单</Button></Link>
                        <div style={{padding: '5px'}}></div>
                        <Card withBorder style={{padding: '0px'}}>
                            <Card.Section withBorder inheritPadding py="xs" >
                                <Group position="apart" style={{padding: '16px', paddingBottom: '0px'}}>
                                    <Text weight={500}>我可以查看的</Text>
                                </Group>
                            </Card.Section>
                            <ProblemList data={data} />
                        </Card>
                    </Grid.Col>
                </Grid>
            </Container>
        );
    } else {
        return (<p></p>);
    }
}
