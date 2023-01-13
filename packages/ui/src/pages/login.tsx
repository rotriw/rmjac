import {
    TextInput,
    PasswordInput,
    Checkbox,
    Anchor,
    Paper,
    Title,
    Text,
    Container,
    Group,
    Button,
} from '@mantine/core';
import {useForm} from "@mantine/form";
import axios from "axios";
import React from "react";
import {IconCheck, IconX} from "@tabler/icons";
import {showNotification, updateNotification} from "@mantine/notifications";


let notiID = 0;
async function goLogin(baseurl :string, username :string, password :string) {
    notiID ++;
    let notificationMsg = {
        id: `login-data-${notiID}`,
        disallowClose: false,
        onClose: () => console.log('unmounted'),
        onOpen: () => console.log('mounted'),
        title: `登录请求 页面提交ID:${notiID}`,
        message: (<div>正在验证您的信息。</div>),
        color: 'blue',
        icon: <IconCheck />,
        className: 'login-notification-class',
        loading: true,
        autoClose: false,
    };
    showNotification(notificationMsg);
    axios.post(`${baseurl}login`, {
        'operation': 'check',
        username,
        password
    }).then((data) => {
        console.log(data);
        notificationMsg.loading = false;
        notificationMsg.color = data.data.status === 'success' ? 'green' : 'red';
        if (data.data.status === 'success') {
            notificationMsg.message = (<div>Done! {data.data.msg} 请刷新以来更新。</div>);
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('uid', data.data.uid);
            localStorage.setItem('setting-user-login', 'true');
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

export function LoginHandler() {
    const form = useForm({
        initialValues: {
            username: '',
            password: '',
        },

    });
    return (
        <Container size={420} my={40}>
            <Title
                align="center"
                sx={(theme) => ({ fontFamily: `Greycliff CF, ${theme.fontFamily}`, fontWeight: 900 })}
            >
                RMJ.ac
            </Title>
            <Text color="dimmed" size="sm" align="center" mt={5}>
                还没有账号？{' '}
                <Anchor<'a'> href="#" size="sm" onClick={(event) => event.preventDefault()}>
                    等候开放注册
                </Anchor>
            </Text>

            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                <TextInput label="用户名"
                           placeholder=""
                           value={form.values.username}
                           onChange={(event) => form.setFieldValue('username', event.currentTarget.value)}

                           required />
                <PasswordInput label="密码"
                               placeholder=""
                               value={form.values.password}
                               onChange={(event) => form.setFieldValue('password', event.currentTarget.value)}
                               required
                               mt="md" />
                <Button
                    fullWidth
                    mt="xl"
                    onClick={async () => await goLogin('http://localhost:8000/', form.values.username, form.values.password)}
                >
                    登录
                </Button>
            </Paper>
        </Container>
    );
}
