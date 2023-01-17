import {Center, Badge, Button, Progress, Container, Grid, Loader, TextInput, UnstyledButton, useMantineTheme} from "@mantine/core";
import { useParams } from 'react-router';
import React, {useEffect, useState} from "react";
import axios from "axios";
import {completeNavigationProgress, setNavigationProgress} from "@mantine/nprogress";
import {ShowCase} from "../component/ShowCase";
import {NotFound} from "../component/404NotFoundView";
import { useToggle, getHotkeyHandler } from "@mantine/hooks";
import { ThemeContext } from "@emotion/react";
import './viewproblem.css';
import { DiffcultBadge } from "../component/difficult";


let ok = false, s404 = false;

async function InitPage(setData: Function, setOK: Function, setS4 :Function, id: string | undefined) {
    let baseurl = window.RMJ.baseurl;
    try {
        setNavigationProgress(0);
        let data = await axios.post(`${baseurl}list`, {
            'operation': 'detail',
            'id': localStorage.getItem('uid'),
            'token': localStorage.getItem('token'),
            'pid': id,
        });
        if (data.data.data === null) {
            throw data.data.error;
        }
        completeNavigationProgress();
        setOK(true);
        setData(data.data.data);
    } catch(err) {
        completeNavigationProgress();
        setS4(true);
        return ;
    }
}

async function updateTitle(newtitle: any, pid :any, ctitle: Function, data :any, setData :Function) {
	if (newtitle === '') {
		ctitle();
		return;
	}
	let n = data;
	n.listName = newtitle;
	let back = await axios.post(`${window.RMJ.baseurl}list`, {
        operation: 'updateTitle',
        id: localStorage.getItem('uid'),
        token: localStorage.getItem('token'),
        pid,
        title: newtitle
	});
	setData(n);
	ctitle();
}

export function ViewProblem() {
    const {id, page} = useParams();
    const [data, setData] = useState({
        id: '',
        listName: '',
        description: '',
        problemList: [],
        viewUser: [],
        manageUser: [1]

    });

	const theme = useMantineTheme();
    const [ok, setOK] = useState(false);
    const [s404, setS4] = useState(false);
    const uid :string = localStorage.getItem('uid') || '';
    useEffect(() => {
        InitPage(setData, setOK, setS4, id);
    }, []);
    if (s404) {
        return (
            <NotFound id={id} />
        );
	}
	const [title, ctitle] = useToggle(['show', 'change']);
	const [newTitle, setTitle] = useState(data?.listName);
	const showTitle = title == 'show' ? (
		<a
			style={{ paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.md }}
			onDoubleClick={() => {
				if (data?.manageUser.includes(Number(uid))) {
					setTitle(data?.listName); ctitle()
				}
		}}><h2 style={{ margin: 0 }}>#{data?.id} - {data?.listName}</h2></a>
	) : (<Grid  style={{paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.sm}}>
			<Grid.Col span={5}>
				<TextInput
					variant="filled"
					value={newTitle}
					onChange={(event)=>{setTitle(event.currentTarget.value)}}
					onKeyDown={
						getHotkeyHandler([
						['Enter', () => {updateTitle(newTitle, id, ctitle, data, setData)}],
						])
					}
					onBlur={() => {
						if (title === 'change') {
							updateTitle(newTitle, id, ctitle, data, setData);
						}
					}}
					autoFocus
					height={theme.headings.sizes.h2 as any} />
			</Grid.Col>

	</Grid>);
    if (ok) {
		let tac :Array<number> = [];
		data?.problemList.map((item: any) => {
			// console.log(item.score);
			if (tac[item.score])
				tac[item.score]++;
			else
				tac[item.score] = 1;
		});
		
		const greenP = (tac[100] || 0) / data?.problemList.length * 100;
		const redP = (tac[1] || 0) / data?.problemList.length * 100;
		const blueP = (tac[0] || 0) / data?.problemList.length * 100;
		let showBar = ((tac[100] || 0) == data?.problemList.length) ? (
			<Progress
				size={20}
				sections={[
					{ value: greenP, className: 'allDone', color: 'green', label: 'Done', tooltip: `All Accepted - ${(tac[100] || 0)} ` },
				]}
			/>) : (
			<Progress
				size={20}
				sections={[
					{ value: greenP , color: 'green', label: 'Accepted', tooltip: `Accepted - ${(tac[100] || 0)} ` },
					{ value: redP, color: 'red', label: 'ERROR', tooltip: `ERROR(WA,TLE,MLE,RE) - ${(tac[1] || 0)}` },
					{ value: blueP, color: 'gray', label: 'No status', tooltip: `No status - ${(tac[0] || 0)}` },
				]}
			/>);
		return (
			<Container>
				{showTitle}
				<Badge radius='sm' size='lg' variant="dot">隐私保护</Badge>
			
				<div style={{ padding: 3 }} />
				{showBar}
				<div style={{ padding: 3 }} />
				<ShowCase pid={id} page={page || 'description'} description={data?.description} problems={data?.problemList} canSetting={data?.manageUser.includes(Number(uid))} />
			</Container>);
    } else {
        return (
            <Container style={{height: '100%'}}>
                <Center>Loading...</Center>
            </Container>
        )
    }
}
