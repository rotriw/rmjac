import {Button, Container, Grid, Input, Tabs, useMantineTheme} from '@mantine/core';
import {IconPhoto, IconMessageCircle, IconSettings, IconChecklist, IconArrowUpRight} from '@tabler/icons';
import React, {useState} from "react";
import Markdown from "markdown-to-jsx";
import {ListProblem} from "./ListProblem";
import {DndList} from "./DnDChangeProblemList";
import {getHotkeyHandler, useListState} from "@mantine/hooks";
import axios from "axios";
import './showCase.css';
import {useNavigate} from "react-router-dom";
import {useParams} from "react-router-dom";

async function changeOrder(data :any, pid :any) {
    let back = await axios.post(`${window.RMJ.baseurl}list`, {
        operation: 'updateProblem',
        id: localStorage.getItem('uid'),
        token: localStorage.getItem('token'),
        pid: pid,
        problem: data
    });
}

function addDatas(inp :string, cInp :Function, H :any, cH :any) {
    let s = inp.replace('，', ',');
    let len = s.length;
    let v = H, vs = '';
    for (let i = 0; i < len; i ++ ) {
        if (inp[i] === ',' || inp[i] === ' ') {
            if (vs !== '') {
                v.push(vs);
                vs = '';
            }
        } else {
            vs += inp[i];
        }
    }
    if (vs !== '') {
        v.push(vs);
    }
    cH.setState(v);
    cInp('');
}


export function ShowCase({problems, page, description, canSetting, pid} :any) {
    const settings = canSetting ? (<Tabs.Tab value="settings">设置</Tabs.Tab>) : (<></>);
    const fastview = problems.length > 100 ? (<Tabs.Tab value="fastview">快速查看</Tabs.Tab>) : (<></>);
    const [state, handlers] = useListState(problems);
    const [input, cInput] = useState('');
    const theme = useMantineTheme();

    const navigate = useNavigate();
    let value = (<></>);

    if (page === 'problems') {
        value = (
            <Tabs.Panel  value="problems" pt="xs">
                <ListProblem data={problems} />
            </Tabs.Panel>
        );
    } else if (page === 'settings') {
        value = (<Tabs.Panel value="settings">
            <Input.Wrapper label='添加' description='使用逗号隔开，将自动添加在最后。'>
                <div style={{marginTop: '2px'}} />
                <Grid>
                    <Grid.Col span={10}>
                        <Input
                            style={{marginTop: '0px'}}
                            icon={<IconChecklist />}
                            placeholder="题目ID"
                            value = {input}
                            onChange={(event) => {cInput(event.currentTarget.value)}}
                            onKeyDown={getHotkeyHandler([
                                ['Enter', () => {addDatas(input, cInput, state, handlers)}],
                            ])}
                        />
                    </Grid.Col>
                    <Grid.Col span={2}>
                        <Button style={{height: '36px'}} onClick={()=> {
                            addDatas(input, cInput, state, handlers);
                        }} fullWidth>添加</Button>
                    </Grid.Col>
                </Grid>
            </Input.Wrapper>
            <Input.Wrapper label='调整顺序' description='调整您的题目顺序'>
                <div style={{padding: '4px'}} />
                <Button color='red' variant='light' style={{height: '36px'}} onClick={()=> {
                    handlers.setState([])
                }} fullWidth>重置</Button>
                <div style={{padding: '4px'}} />
                <DndList state={state} handlers={handlers}></DndList>
            </Input.Wrapper>
            <div style={{marginTop: '15px'}} />
            <Button fullWidth onClick={() => {changeOrder(state, pid)}}>提交更改</Button>
        </Tabs.Panel>);
    } else if (page === 'fastview') {
        const {viewed} = useParams();
        // @ts-ignore
        const showNoStyle = problems.map((item) => (
            <>
                <span style={{color: 'red', fontWeight: 800}}> NO STATUS </span> {item} <a target='_blank' href={`https://www.luogu.com.cn/problem/${item}`}>href</a> <br />
            </>
        ));
        value = (
          <Container sx={{ fontFamily: 'monospace'}} style={{paddingTop: 15}}>
                <div style={{backgroundColor: theme.colors.gray[2], maxHeight: 500, overflowY: "scroll"}} >
                    {showNoStyle}
                </div>
          </Container>
        );
    } else {
        value = (
            <Tabs.Panel value="description" pt="xs">
                <Markdown>
                    {description || '*无简介*'}
                </Markdown>
            </Tabs.Panel>);
    }

    return (
        <Tabs value={page} onTabChange={(value) => window.location.href=`/view/${pid}/${value}`}  variant="pills"  >
            <Tabs.List>
                <Tabs.Tab value="description">简介</Tabs.Tab>
                <Tabs.Tab value="problems">内容</Tabs.Tab>
                {fastview}
                {settings}
            </Tabs.List>
            {value}
        </Tabs>
    );
}
