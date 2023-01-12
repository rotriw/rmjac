import {Button, Card, Container, Grid, Group, Input, MultiSelect, Text, Textarea} from "@mantine/core";
import {ProblemList} from "../component/ProblemList";
import React, {useState} from "react";
import {useForm} from "@mantine/form";
import {IconCheck, IconX} from "@tabler/icons";
import {showNotification, updateNotification} from "@mantine/notifications";
import axios from "axios";
// import {AlignRightControl} from "@mantine/tiptap/lib/controls";

let notiID = 0;

async function goNew(baseurl :string, id :string | null, token :string | null, title :string, viewUser :Array<string>, manageUser :Array<string>, description :string, problems :Array<string>) {
    notiID ++;
    let notificationMsg = {
        id: `new-data-${notiID}`,
        disallowClose: false,
        onClose: () => console.log('unmounted'),
        onOpen: () => console.log('mounted'),
        title: `登录请求 页面提交ID:${notiID}`,
        message: (<div>正在提交您的信息。</div>),
        color: 'indigo',
        icon: <IconCheck />,
        className: 'login-notification-class',
        loading: true,
        autoClose: false,
    };
    showNotification(notificationMsg);
    axios.post(`${baseurl}list`, {
        'operation': 'create',
        id,
        token,
        title,
        description,
        viewUser,
        manageUser,
        problemList: problems
    }).then((data) => {
        console.log(data);
        notificationMsg.loading = false;
        notificationMsg.color = data.data.status === 'success' ? 'green' : 'red';
        if (data.data.status === 'success') {
            notificationMsg.message = (<div>Done! {data.data.msg} 请刷新以来更新。</div>);
        } else {
            notificationMsg.message = (<div>{data.data.error || data.data.msg}</div>);
        }
        updateNotification(notificationMsg);
    }).catch(err => {
        console.log(err);
        notificationMsg.loading = false;
        notificationMsg.icon = <IconX />;
        notificationMsg.color = 'red';
        notificationMsg.message = (<div>error, open console log.</div>);

    });
}

export function NewProblem() {
    const [data, setData] = useState([]);

    const form = useForm({
        initialValues: {
            title: '',
            viewUser: [''],
            manageUser: [''],
            description: '',
            problems: [''],
        },
    });
    return (<Container>
        <h2>新建一个题单</h2>
        <Input.Wrapper
            id="input-demo"
            withAsterisk
            label="题单名称"
            description="题单名称"
        >
            <Input id="name" placeholder="title" value={form.values.title}
                   onChange={(event) => form.setFieldValue('title', event.currentTarget.value)}
            />
        </Input.Wrapper>
        <MultiSelect
            label="可查看用户uid"
            description="填写可查看用户uid（必须为数字序列）在v1.0版本前请务必添加自己。"
            data={data}
            placeholder=""
            searchable
            onChange={(value)=> {form.setFieldValue('viewUser', value)}}
            creatable
            getCreateLabel={(query) => `${query}`}
            // onCreate={(query) => {
            //     const item = { value: query, label: query };
            //     setData((current) => {
            //         return [...current, item];
            //     });
            //     return item;
            // }}
        />
        <MultiSelect
            label="可管理用户"
            data={data}
            description="填写可管理用户uid（必须为数字序列）在v1.0版本前请务必添加自己。"
            searchable
            onChange={(value)=> {form.setFieldValue('mangeUser', value)}}
            creatable
            getCreateLabel={(query) => `${query}`}
            // onCreate={(query) => {
            //     const item = { value: query, label: query };
            //     setData((current) => {
            //         return [...current, item];
            //     });
            //     return item;
            // }}
        />
        <MultiSelect
            label="题目列表"
            data={data}
            description="填写题目ID。该部分将进行修改更符合操作顺序。要不然写不完了。（TODO）"
            searchable
            onChange={(value)=> {form.setFieldValue('problems', value)}}
            creatable
            getCreateLabel={(query) => `${query}`}
            // onCreate={(query) => {
            //     const item = { value: query, label: query };
            //     setData((current) => {
            //         return [...current, item];
            //     });
            //     return item;
            // }}
        />
        <Textarea
            placeholder="描述"
            label="支持markdown"
            value={form.values.description}
            autosize
            minRows={4}
            maxRows={8}
            onChange={(event)=> {form.setFieldValue('description', event.currentTarget.value)}}
        />
        <div style={{padding: '3px'}}></div>
        <div style={{width: '100%', textAlign: 'right'}}><Button fullWidth onClick={() => {
            goNew('http://localhost:8000/', localStorage.getItem('uid'), localStorage.getItem('token'),
                form.values.title, form.values.viewUser, form.values.manageUser, form.values.description,
                form.values.problems);
        }
        }>创建 + </Button></div>

    </Container>)
}
