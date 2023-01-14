import {
    Button,
    Card,
    Container,
    Grid,
    Group,
    Input,
    Modal,
    MultiSelect,
    Text,
    Textarea,
    useMantineTheme
} from "@mantine/core";
import {ShowList} from "../component/ShowList";
import React, {useState} from "react";
import {useForm} from "@mantine/form";
import {IconCheck, IconCircleCheck, IconX, IconChecks} from "@tabler/icons";
import {showNotification, updateNotification} from "@mantine/notifications";
import axios from "axios";
import {DescriptionEditor} from "../component/DescriptionEditor";
import {Link, NavLink} from "react-router-dom";
// import {AlignRightControl} from "@mantine/tiptap/lib/controls";

let notiID = 0;


async function goNew(baseurl :string, id :string | null, token :string | null, title :string, viewUser :Array<string>, manageUser :Array<string>, description :string, problems :Array<string>, setNotify :Function) {
    notiID ++;
    let notificationMsg = {
        id: `new-data-${notiID}`,
        disallowClose: false,
        onClose: () => console.log('unmounted'),
        onOpen: () => console.log('mounted'),
        title: `创建请求 页面提交ID:${notiID}`,
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
        setNotify(true);
        notificationMsg.autoClose = true;

        updateNotification(notificationMsg);
    }).catch(err => {
        console.log(err);
        notificationMsg.loading = false;
        notificationMsg.icon = <IconX />;
        notificationMsg.color = 'red';
        notificationMsg.message = (<div>error, open console log.</div>);

    });
}

let description = '';
function setDes(value :any) {
    description = value;
}

export function NewProblem() {
    const [data, setData] = useState([]);
    const [noc, setNoc] = useState([]);
    const [notify, setNotify] = useState(false);
    const theme = useMantineTheme();
    const form = useForm({
        initialValues: {
            title: '',
            viewUser: [],
            manageUser: [],
            viewUserSearch: '',
            manageUserSearch: '',
            problemsSearch: '',
            description: '',
            problems: [],
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
            data={form.values.viewUser}
            placeholder=""
            searchable
            searchValue={form.values.viewUserSearch}
            value={form.values.viewUser}
            onChange={(value)=> {form.setFieldValue('viewUser', value as never)}}
            onSearchChange={(value) => {
                    let len = value.length, now = '';
                    let c = form.values.viewUser;
                    for (let i = 0; i < len; i ++ ) {
                        if (value[i] === ',' || (value[i] === ' ' && now !== '')) {
                            if (now !== ' ' && now !== '')
                                c.push(now as never);
                            now = '';
                        } else {
                            if (value[i] !== '')
                                now += value[i];
                        }
                    }
                    form.setFieldValue('viewUser', c);
                    form.setFieldValue('viewUserSearch', now);
                }
            }
            creatable
            getCreateLabel={(query) => `${query}`}
            onCreate={(query) => {
                const item = { value: query, label: query };
                // @ts-ignore
                form.setFieldValue('viewUser', (current: string[]) => {
                    return [...current, item];
                });
                return item;
            }}
        />
        <MultiSelect
            label="可管理用户uid"
            data={form.values.manageUser}
            description="填写可管理用户uid（必须为数字序列）在v1.0版本前请务必添加自己。"
            searchValue={form.values.manageUserSearch}
            searchable
            value={form.values.manageUser}
            onChange={(value)=> {form.setFieldValue('manageUser', value as never)}}
            onSearchChange={(value) => {
                let len = value.length, now = '';
                let c = form.values.manageUser;
                for (let i = 0; i < len; i ++ ) {
                    if (value[i] === ',' || (value[i] === ' ' && now !== '')) {
                        if (now !== ' ' && now !== '')
                            c.push(now as never);
                        now = '';
                    } else {
                        if (value[i] !== '')
                            now += value[i];
                    }
                }
                form.setFieldValue('manageUser', c);
                form.setFieldValue('manageUserSearch', now);
            }
            }
            creatable
            getCreateLabel={(query) => `${query}`}
            onCreate={(query) => {
                const item = { value: query, label: query };
                // @ts-ignore
                form.setFieldValue('manageUser', (current: string[]) => {
                    return [...current, item];
                });
                return item;
            }}
        />
        <MultiSelect
            label="题目列表"
            data={form.values.problems}
            description="填写题目ID。该部分将进行修改更符合操作顺序。要不然写不完了。（TODO）"
            searchable
            searchValue={form.values.problemsSearch}
            value={form.values.problems}
            onChange={(value)=> {form.setFieldValue('problems', value as never)}}
            onSearchChange={(value) => {
                let len = value.length, now = '';
                let c = form.values.problems;
                for (let i = 0; i < len; i ++ ) {
                    if (value[i] === ',' || (value[i] === ' ' && now !== '')) {
                        if (now !== ' ' && now !== '')
                            c.push(now as never);
                        now = '';
                    } else {
                        if (value[i] !== '')
                            now += value[i];
                    }
                }
                form.setFieldValue('problems', c);
                form.setFieldValue('problemsSearch', now);
            }
            }
            creatable
            getCreateLabel={(query) => `${query}`}
            onCreate={(query) => {
                const item = { value: query, label: query };
                // @ts-ignore
                form.setFieldValue('problems', (current: string[]) => {
                    return [...current, item];
                });
                return item;
            }}
        />
        <div style={{padding: '7px'}}></div>
        <Input.Wrapper label='描述' description='填写您的简介'>
            <div style={{padding: '2px'}}></div>
            <DescriptionEditor value={description} setValue={setDes} />
        </Input.Wrapper>
        <div style={{padding: '3px'}}></div>
        <div style={{width: '100%', textAlign: 'right'}}><Button fullWidth onClick={() => {
            console.log(description);
            goNew(window.RMJ.baseurl, localStorage.getItem('uid'), localStorage.getItem('token'),
                form.values.title, form.values.viewUser, form.values.manageUser, description,
                form.values.problems, setNotify);
        }
        }>创建 + </Button></div>

        <Modal
            opened={notify}
            onClose={() => setNotify(false)}
            withCloseButton={false}
            centered

        >
            <div style={{textAlign: 'center', display: 'inline-block', width: '100%'}}>
                <div style={{borderRadius: '99999px', backgroundColor:  theme.colorScheme === 'dark' ? '#8CE99A20' : '#D3F9D8', marginLeft: 'auto', marginRight: 'auto', width: '60px', height: '60px', justifyContent: 'center', alignItems: 'center', display: 'flex'}}>
                    <IconCheck stroke={1.5} size={'35px'} color={theme.colorScheme === 'dark' ? '#B2F2BB75' : '#69DB7C'} />
                </div>
                <div style={{padding: '0px'}}></div>
                <h3>创建成功</h3>
                <Grid>
                    <Grid.Col span={12} >
                       <NavLink to={'/'} style={{textDecoration: 'none'}}><Button variant="light" fullWidth>返回主页</Button></NavLink>
                    </Grid.Col>
                </Grid>
            </div>
        </Modal>
    </Container>)
}
