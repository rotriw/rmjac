import { Button, Container, Input, Space, TextInput, Text, createStyles } from '@mantine/core';
import { useForm } from '@mantine/form';
import React, { useState } from 'react';
import { NoStyleCard } from '../components/card';
import { VditorProvider, VditorThemeChangeProvider } from '../components/editor';
import Vditor from 'vditor';
import { standardTitleColor } from '../styles/color';
import { handleCreate, createError } from '../handlers/discussHandler';
import { notifications } from '@mantine/notifications';
import { IconX, IconCheck, IconInfoSmall } from '@tabler/icons-react';
import { alarm } from '../styles/alarm';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useStyles = createStyles((theme) => ({}));

export function DiscussCreatePage() {
    const [contentVditor, setContentVditor] = useState({});
    const { theme } = useStyles();

    const createForm = useForm({
        initialValues: {
            topic: '灌水区',
            title: '',
            tags: [],
        },
    });

    return (
        <>
            <Container>
                {/* <Alert  icon={<IconAlertCircle size='1rem' />} title='注意' color='red'>
                    无权限发送
                </Alert> */}
                <Space h={1} />
                <NoStyleCard style={{ backgroundImage: 'linear-gradient(45deg, #ff9a9e50 0%, #fad0c450 99%, #fad0c450 100%)' }}>
                    <Text size='sm' weight={300} c={standardTitleColor(theme)}>
                        您的讨论将会发表在
                    </Text>
                    <Space h={1} />
                    <Text size='lg' weight={700} c={standardTitleColor(theme)}>
                        灌水区
                    </Text>
                    <Text ta={'right'} size='xs' weight={300} c={standardTitleColor(theme)}>
                        点击本卡片更换
                    </Text>
                </NoStyleCard>
                <Space h={10}></Space>
                <NoStyleCard>
                    <form
                        onSubmit={createForm.onSubmit(async (data) => {
                            const response = await handleCreate({
                                ...data,
                                content: (contentVditor as Vditor).getValue(),
                                token: localStorage.getItem('token') || '',
                            });
                            // if (!response.data || response.data?.did) {
                                // response.status === 'error';
                            // }
                            notifications.show({
                                title: response.status === 'success' ? '' : '发布失败',
                                message: (
                                    <>
                                        {response.status === 'success'
                                            ? '发布成功！即将跳转到发帖页面……'
                                            : `错误！${createError[response.type || ''] || '未知错误'}${createError[response.param || 'default'] || ''}。`}
                                        {response.status === 'error' ? <br /> : <></>}
                                        {response.status === 'error' ? '若您还需要知道更多信息请查看控制台。' : ''}
                                    </>
                                ),
                                color: response.status === 'error' ? 'red' : 'green',
                                icon: response.status === 'error' ? <IconX /> : <IconCheck />,
                                withCloseButton: false,
                                styles: alarm(response.status),
                            });
                            console.info('技术参数');
                            console.info(response);
                            if (response.status === 'success') {
                                setTimeout(() => {
                                    if (window.web?.disableJump !== true) {
                                        location.href = '/discuss/' + response.data?.did;
                                    } else {
                                        notifications.show({
                                            title: '通知',
                                            message: '跳转请求已忽略。',
                                            color: 'blue',
                                            icon: <IconInfoSmall />,
                                        });
                                    }
                                }, 2000);
                            }
                        })}
                    >
                        {/* <Space h={10} /> */}
                        {/* <Grid>
                            <Grid.Col span={4}>
                                <TextInput size='xs' variant='filled' name='topic' required={true} placeholder='讨论主题' />
                            </Grid.Col>
                        </Grid> */}
                        {/* <Space h={1} /> */}
                        <TextInput
                            mt={-10}
                            size='xl'
                            variant='unstyled'
                            name='title'
                            required={true}
                            placeholder='请输入讨论标题'
                            {...createForm.getInputProps('title')}
                        />

                        {/* <Grid>
                            <Grid.Col span={8}>
                                <TextInput size='xl' variant='unstyled' name='title' required={true} placeholder='讨论标题' />
                            </Grid.Col>
                            <Grid.Col span={4}></Grid.Col>
                        </Grid> */}
                        <Input.Wrapper
                            id='content'
                            description='*正文部分, 支持markdown语法'
                            required={true}
                            inputWrapperOrder={['input', 'description', 'label', 'error']}
                            {...createForm.getInputProps('content')}
                        >
                            <Space h={4} />
                            <VditorProvider fontLimit={3000} minHeight={300} id='create-vditor' setVd={setContentVditor} />
                            <VditorThemeChangeProvider vditor={contentVditor as Vditor} />
                        </Input.Wrapper>

                        <Space h={10} />
                        <Button className='shadowButton' type='submit' radius={'xl'}>
                            发起讨论
                        </Button>
                    </form>
                </NoStyleCard>
            </Container>
        </>
    );
}
