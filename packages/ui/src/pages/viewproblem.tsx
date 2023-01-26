import {Center, Popover, Badge, Button, Progress, Container, Grid, Loader, TextInput, UnstyledButton, useMantineTheme} from "@mantine/core";
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
import {ShowHeaders} from "../component/viewheader";
import {NoAccess} from "../component/NOAccess";


let ok = false, s404 = false;

async function InitPage(setData: Function, setOK: Function, setS4 :Function, id: string | undefined) {
    let baseurl = window.RMJ.baseurl;
    let data: any = {};
    try {
        setNavigationProgress(0);
        data = await axios.post(`${baseurl}list`, {
            'operation': 'detail',
            'id': localStorage.getItem('uid'),
            'token': localStorage.getItem('token'),
            'pid': id,
        });
        if (data.data.data === null) {
            throw data.data.error;
        }
        setOK(true);
        setData(data.data.data);
    } catch(err) {

        completeNavigationProgress();
        // setS4(true);
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
        Perm: [''],
        manageUser: [1],
        PERM: new Map<string, {
                perm: string
        }>(),
        canView: true,
        canSettings: false,
        PermData: [''],
    });

	const theme = useMantineTheme();
    const [ok, setOK] = useState(false);
    const [s404, setS4] = useState(false);
    const uid :string = localStorage.getItem('uid') || '';
    useEffect(() => {
        InitPage(setData, setOK, setS4, id);
    }, []);
    if (s404 && data?.canView === undefined) {
        return (
            <NotFound id={id} />
        );
	}

    const [title, ctitle] = useToggle(['show', 'change']);
    const [newTitle, setTitle] = useState(data?.listName || '');
    if (ok && data?.canView) {
        const showTitle = title == 'show' ? (
            <><a
                style={{ paddingTop: theme.spacing.sm, paddingBottom: theme.spacing.md }}
                onDoubleClick={() => {
                    if (data?.Perm.includes('title')) {
                        setTitle(data?.listName); ctitle()
                    }
                }}><h2 style={{ margin: 0 }}>{data?.listName}</h2></a></>
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
        console.log(data?.canSettings);
		return (
			<div>
				<ShowCase listName={showTitle} pid={id} page={page || 'description'} description={data?.description} problems={data?.problemList} canSetting={data?.canSettings} Perm={data?.Perm} permsData={data?.PermData} />
			</div>);
    } else if (!data?.canView) {
        console.log('qwq');
        return (<NoAccess id={id} perm={'view'}  />);
    } else {
        return (
            <Container style={{height: '100%'}}>
                <Center>Loading...</Center>
            </Container>
        )
    }
}
