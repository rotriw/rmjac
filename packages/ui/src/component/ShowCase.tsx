import {Button, Container, Grid, Input, Tabs, useMantineTheme} from '@mantine/core';
import {IconPhoto, IconMessageCircle, IconSettings, IconChecklist, IconArrowUpRight} from '@tabler/icons';
import React, {useState} from "react";
import Markdown from "markdown-to-jsx";
import { ListProblem } from "./ListProblem";
import { ListProblemNew } from "./ListProblemNew";
import {DndList} from "./DnDChangeProblemList";
import {getHotkeyHandler, useListState, useToggle} from "@mantine/hooks";
import Vditor from "vditor";
import axios from "axios";
import './showCase.css';
import {useNavigate} from "react-router-dom";
import {useParams} from "react-router-dom";
import {NotFound} from "./404NotFoundView";
import {NoAccess} from "./NOAccess";
import { MarkdownEdit } from './vditor';
import { MarkdownShow } from './ShowMarkdown';

async function changeOrder(data :any, pid :any) {
    let tdata = [];
    for (let i = 0; i < data.length; i ++ )
        tdata.push(data[i].id);
    let back = await axios.post(`${window.RMJ.baseurl}list`, {
        operation: 'updateProblem',
        id: localStorage.getItem('uid'),
        token: localStorage.getItem('token'),
        pid: pid,
        problem: tdata
    });
    window.location.href= tdata.length >= 100 ?`/view/${pid}/fastview` : `/view/${pid}/problems`;
}

async function updateContent(data: any, pid: any) {
	let back = await axios.post(`${window.RMJ.baseurl}list`, {
        operation: 'updateDescription',
        id: localStorage.getItem('uid'),
        token: localStorage.getItem('token'),
        pid: pid,
        description: data
    });
	alert('更新简介成功。');
}

function addDatas(inp :string, cInp :Function, H :any, cH :any) {
    let s = inp.replace('，', ',');
    let len = s.length;
    let v = H, vs = '';
    for (let i = 0; i < len; i ++ ) {
        if (inp[i] === ',' || inp[i] === ' ') {
            if (vs !== '') {
                v.push({id: vs, name: '暂不爬取，请更新后获取。'});
                vs = '';
            }
        } else {
            vs += inp[i];
        }
    }
    if (vs !== '') {
        v.push({id: vs, name: '暂不爬取，请更新后获取。'});
    }
    cH.setState(v);
    cInp('');
}


function changeD() {
	let setItemEvent = new Event("openchange");
	window.dispatchEvent(setItemEvent);
}

export function ShowCase({problems, page, description, canSetting, pid} :any) {
    const settings = canSetting ? (<Tabs.Tab value="settings">设置</Tabs.Tab>) : (<></>);
    const fastview = problems.length > 100 ? (<Tabs.Tab value="fastview">快速查看</Tabs.Tab>) : (<></>);
    const [state, handlers] = useListState(problems);
    const [input, cInput] = useState('');
    const theme = useMantineTheme();
	const [showSetDescriptionText, setShowSetDescriptionText] = useToggle(['更新内容']);

	const [vd, setVd] = React.useState<Vditor>();
    const navigate = useNavigate();
    let value = (<></>);

    if (page === 'problems') {
        value = (
            <Tabs.Panel  value="problems" pl="xs" pt="xs">
                <ListProblemNew data={problems} />
            </Tabs.Panel>
        );
    } else if (page === 'settings') {
        if (canSetting === false) {
            value = (<NoAccess id={pid} />)
        } else
			value = (
		
				<Tabs.Panel pl="xs" value="settings">
					<div style={{marginTop: theme.spacing.sm}}></div>
					<Tabs defaultValue="problem" variant='pills'>
						<Tabs.List grow>
							<Tabs.Tab value="problem">题目管理</Tabs.Tab>
							<Tabs.Tab value="description">描述管理</Tabs.Tab>
						</Tabs.List>
						<Tabs.Panel pl="xs"  value="problem" pt="xs">
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
						</Tabs.Panel>
						<Tabs.Panel pl="xs"  value="description" pt="xs">
							<MarkdownEdit def={description} vd={vd} setVd={setVd}  openPreview={false} />	
							<div style={{ marginTop: theme.spacing.sm }}></div>
							<Button onClick={() => {
									// setShowSetDescriptionText();
									if (showSetDescriptionText === '更新内容') {
										updateContent(vd?.getValue(), pid);
									}
									// changeD();
								}} >{showSetDescriptionText}</Button>
						</Tabs.Panel>
				</Tabs>
				
			</Tabs.Panel>);
    } else if (page === 'fastview') {
        const {viewed} = useParams();
        // @ts-ignore
        const showNoStyle = problems.map((item) => (
            <>
                <span style={{color: item.score === 100 ? 'green': item.score > 0 ? 'red' : 'grey', fontWeight: 800}}>    {item.score === 100 ? 'Accepted' : item.score > 0 ? 'ERROR': <>NO STATUS</> }
                  </span> {item.id} {item.name} <a target='_blank' href={`https://www.luogu.com.cn/problem/${item.id}`}>href</a> <br />
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
			<Tabs.Panel pl="xs"  value="description" pt="xs">
				<MarkdownShow md={description}></MarkdownShow>
				
			</Tabs.Panel>);
    }

    return (
        <Tabs variant="outline" value={page} onTabChange={(value) => window.location.href=`/view/${pid}/${value}`}   >
            <Tabs.List grow>
                <Tabs.Tab value="description">简介</Tabs.Tab>
				<Tabs.Tab value="problems">内容</Tabs.Tab>
                {fastview}
				{settings}
            </Tabs.List>
            {value}
        </Tabs>
    );
}
