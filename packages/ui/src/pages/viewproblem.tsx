import {Container} from "@mantine/core";
import { useParams } from 'react-router';
import React, {useEffect, useState} from "react";
import axios from "axios";
import {completeNavigationProgress, setNavigationProgress} from "@mantine/nprogress";
import {ShowCase} from "../component/ShowCase";


let ok = false;

async function InitPage(setData: Function, setOK: Function, id: string | undefined) {
    let baseurl = `http://localhost:8000/`;
    setNavigationProgress(50);
    let data = await axios.post(`${baseurl}list`, {
        'operation': 'detail',
        'id': localStorage.getItem('uid'),
        'token': localStorage.getItem('token'),
        'pid': id,
    });
    completeNavigationProgress();
    setOK(true);
    setData(data.data.data);
    console.log(data.data.data);
}

export function ViewProblem() {
    const {id} = useParams();
    const [data, setData] = useState({
        id: '',
        listName: '',
        description: '',
        problemList: [],
        viewUser: [],
        manageUser: [1]

    });

    const [ok, setOK] = useState(false);
    const uid :string = localStorage.getItem('uid') || '';
    useEffect(() => {
        InitPage(setData, setOK, id);
    }, []);
    if (ok) {
        return (<Container>
            <h2>#{data?.id} - {data?.listName}</h2>
            <ShowCase description={data?.description} problems={data?.problemList} canSetting={data?.manageUser.includes(Number(uid))}  />
        </Container>)
    } else {
        return (
            <></>
        )
    }
}
