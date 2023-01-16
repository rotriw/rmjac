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
async function goLogin(baseurl :string, username :string, password :string, invite: string) {
    notiID ++;
    let notificationMsg = {
        id: `login-data-${notiID}`,
        disallowClose: false,
        onClose: () => {},
        onOpen: () => {},
        title: `注册 页面提交ID:${notiID}`,
        message: (<div>正在验证您的信息。</div>),
        color: 'blue',
        icon: <IconCheck />,
        className: 'login-notification-class',
        loading: true,
        autoClose: false,
    };
    showNotification(notificationMsg);
    axios.post(`${baseurl}register`, {
        'operation': 'register',
        username,
		password,
		invite,
    }).then((data) => {
        notificationMsg.loading = false;
        notificationMsg.color = data.data.status === 'success' ? 'green' : 'red';
        if (data.data.status === 'success') {
            notificationMsg.message = (<div>Done! {data.data.msg} 请稍等两秒 自动前往登录。</div>);
            setTimeout(() => {
                window.location.href=`/login`
            }, 1000);
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

export function RegisterHandler({}) {
    const form = useForm({
        initialValues: {
            username: '',
			password: '',
			invite: '',
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
                注册一个新账户
            </Text>

            <Paper withBorder shadow="md" p={30} mt={30} radius="md">
                <TextInput label="用户名"
                           placeholder=""
                           value={form.values.username}
                           onChange={(event) => form.setFieldValue('username', event.currentTarget.value)}

                           required />
                <PasswordInput label="设置密码"
                               placeholder=""
                               value={form.values.password}
                               onChange={(event) => form.setFieldValue('password', event.currentTarget.value)}
                               required
					mt="md" />
				<TextInput label="邀请码"
						description="联系有关人士获取"
						placeholder=""
						value={form.values.invite}
						onChange={(event) => form.setFieldValue('invite', event.currentTarget.value)}

						required />
                <Button
                    fullWidth
                    mt="xl"
                    onClick={async () => await goLogin(window.RMJ.baseurl, form.values.username, form.values.password, form.values.invite)}
                >
                    注册
                </Button>
            </Paper>
        </Container>
    );
}
