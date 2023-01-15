import {Center, Container, Loader} from "@mantine/core";
import { useParams } from 'react-router';
import React, {useEffect, useState} from "react";
import axios from "axios";
import {completeNavigationProgress, setNavigationProgress} from "@mantine/nprogress";
import {ShowCase} from "../component/ShowCase";
import {NotFound} from "../component/404NotFoundView";


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
    if (ok) {
        return (<Container>
            <h2>#{data?.id} - {data?.listName}</h2>
            <ShowCase pid={id} page={page || 'description'} description={data?.description} problems={data?.problemList} canSetting={data?.manageUser.includes(Number(uid))}  />
        </Container>)
    } else {
        return (
            <Container style={{height: '100%'}}>
                <Center><Loader /></Center>
            </Container>
        )
    }
}
