import {
    createStyles,
    Table,
    Progress,
    Anchor,
    Text,
    Group,
    Input,
    ScrollArea,
    Checkbox,
    Title,
    Grid, Button
} from '@mantine/core';
import React, {useState} from 'react';
import {useForm} from "@mantine/form";
import {IconChecklist, IconUser, IconUsers} from "@tabler/icons";
import {getHotkeyHandler} from "@mantine/hooks";
import axios from "axios";

const useStyles = createStyles((theme) => ({
    progressBar: {
        '&:not(:first-of-type)': {
            borderLeft: `3px solid ${theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white}`,
        },
    },
}));

interface TableReviewsProps {
    data :{
        uname :string,
        id :string,
        Perm :Array<string>,
    }[];
    id :string;
    pid :string;
    token :string;
}

const permList = [
    {
        'id': 'view',
        'name': '查看',
    },
    {
        'id': 'problem',
        'name': '题目',
    },
    {
        'id': 'user',
        'name': '管理',
    },
    {
        'id': 'title',
        'name': '标题',
    },
    {
        'id': 'description',
        'name': '描述',
    },
]


async function addData(input :string, cInput :(name :string) => void, perms :any) {
    const data = await axios.post(`${window.RMJ.baseurl}user`, {
        'operation': 'userGet',
        'detail': input
    })
    cInput('');
    if (data.data.status === 'success') {
        console.log('qwq');
        const ta = perms.values.value;
        console.log(ta.filter((item :any) => {
            console.log(item);
            return item.id === data.data.id
        }));
        if (ta.filter((item :any) => item.id.toString() === data.data.id.toString()).length) {
            return ;
        }
        ta.push({
            Perm: ['view'],
            id: data.data.id,
            uname: data.data.username
        })
        perms.setFieldValue('value', ta);
    }
}

export async function PERMUpdate(perm :any, id :string, pid :string, token :string) {
    const data = await axios.post(`${window.RMJ.baseurl}list`, {
        'operation': 'updatePERM',
        perm, id, pid, token
    });
    alert('更新PERM成功');
}

export function PERMControl({ data, id, pid, token }: TableReviewsProps) {
    const { classes, theme } = useStyles();
    const perms = useForm({
        initialValues: {value: data},
    });
    const [input, cInput] = useState('');

    const TitleShow = permList.map((row)=>(
        // eslint-disable-next-line react/jsx-key
        <th>
            {`${row.name} (${row.id})`}
        </th>
    ));

    const rows = perms.values.value.map((row, index) => {
        const option =  permList.map((item) => (
            <td>
                <Checkbox checked={row.Perm.includes(item.id)} onChange={() => {
                    const newRow = row;
                    if (!row.Perm.includes(item.id)) {
                        newRow.Perm.push(item.id);
                    } else {
                        newRow.Perm = row.Perm.filter((filid) => filid !== item.id);
                    }
                    const NewRowTotal = perms.values.value;
                    NewRowTotal[index] = newRow;
                    perms.setFieldValue('value', NewRowTotal);
                }} />
            </td>
        ));
        return (
            <tr key={row.id}>
                <td>
                    {row.uname}
                </td>
                <td>
                    {row.id}
                </td>
                {option}
            </tr>
        );
    });

    return (
        <>
            <Input.Wrapper label={'添加用户'} description={'添加一个用户到权限列表。支持用户名或者uid'}>
                <div style={{marginTop: '2px'}} />
                <Grid>
                    <Grid.Col span={10}>
                        <Input
                            style={{marginTop: '0px'}}
                            icon={<IconUser size={15} stroke={1} />}
                            placeholder="UserID / Username (Enter 来添加)"
                            value = {input}
                            onChange={(event) => {cInput(event.currentTarget.value)}}
                            onKeyDown={getHotkeyHandler([
                                ['Enter', () => {
                                    addData(input, cInput, perms);
                                }],
                            ])}
                        />
                    </Grid.Col>
                    <Grid.Col span={2}>
                        <Button style={{height: '36px'}} onClick={()=> {
                            addData(input, cInput, perms);
                        }} fullWidth>添加</Button>
                    </Grid.Col>
                </Grid>
            </Input.Wrapper>
            <div style={{marginTop: 4}} />
            <Input.Wrapper label={'权限控制'} description={'处理具体权限控制'}>
                <ScrollArea>
                    <Table sx={{ minWidth: 800 }} verticalSpacing="xs">
                        <thead>
                        <tr>
                            <th>用户名</th>
                            <th>uid</th>
                            {TitleShow}
                        </tr>
                        </thead>
                        <tbody>{rows}</tbody>
                    </Table>
                </ScrollArea>
            </Input.Wrapper>
            <Button onClick={() => {
                PERMUpdate(perms.values.value, id, pid, token);
            }}>更新数据</Button>
        </>
    );
}
