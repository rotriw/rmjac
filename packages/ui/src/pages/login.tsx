import { useToggle, upperFirst, useMediaQuery } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { handleLogin, handleRegister, loginError, registerError } from '../handlers/loginHandler';
import { notifications } from '@mantine/notifications';
import {
    TextInput,
    PasswordInput,
    Text,
    Group,
    Button,
    Checkbox,
    Anchor,
    Stack,
    Container,
    Box,
    Popover,
    Progress,
    Select,
    rem,
    createStyles,
} from '@mantine/core';
import React, { useState } from 'react';
import { IconCheck, IconInfoSmall, IconX } from '@tabler/icons-react';
import { StandardCard } from '../components/card';
import { standardSelect } from '../styles/select';
import { standardTitleColor } from '../styles/color';
import { alarm } from '../styles/alarm';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useStyles = createStyles((theme) => ({
    nodisplay: {
        display: 'none',
    },
}));

function PasswordRequirement({ meets, label }: { meets: boolean; label: string }) {
    return (
        <Text color={meets ? 'teal' : 'red'} sx={{ display: 'flex', alignItems: 'center' }} mt={7} size='sm'>
            {meets ? <IconCheck size='0.9rem' /> : <IconX size='0.9rem' />} <Box ml={10}>{label}</Box>
        </Text>
    );
}

const requirements = [
    { re: /[0-9]/, label: '包含至少 1 位数字' },
    { re: /[a-z]/, label: '包含至少 1 位小写字母' },
    { re: /[A-Z]/, label: '包含 1 位大写字母（可选）' },
    { re: /[$&+,:;=?@#|'<>.^*()%!-]/, label: '包含特殊符号（可选）' },
];

function getStrength(password: string) {
    let multiplier = password.length >= 8 ? 0 : 1;

    requirements.forEach((requirement) => {
        if (!requirement.re.test(password)) {
            multiplier += 1;
        }
    });

    return Math.max(100 - (100 / (requirements.length + 1)) * multiplier, 10);
}

export default function LoginPage() {
    const [type, toggle] = useToggle(['登录', '注册']);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { classes, cx, theme } = useStyles();
    const registerForm = useForm({
        initialValues: {
            email: '',
            username: '',
            password: '',
            gender: 'male',
            terms: true,
        },

        validate: {
            email: (val) => {
                return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,10})+$/.test(val) ? null : '不符合邮箱规则';
            },
            username: (val) => {
                if (val.length < 4) {
                    return '用户名需要至少 4 位！';
                } else if (val.length > 36) {
                    return '用户名最多只能 36 位！';
                } else {
                    return;
                }
            },
        },

        validateInputOnChange: true,
    });

    const [popoverOpened, setPopoverOpened] = useState(false);
    const checks = requirements.map((requirement, index) => (
        <PasswordRequirement key={index} label={requirement.label} meets={requirement.re.test(registerForm.values.password)} />
    ));

    const strength = getStrength(registerForm.values.password);
    const color = strength === 100 ? 'teal' : strength > 50 ? 'yellow' : 'red';

    const loginForm = useForm({
        initialValues: {
            email: '',
            password: '',
        },
    });

    const currDate = new Date();
    const minBirthYear = currDate.getFullYear() - (currDate.getMonth() + 1 < 9 ? 18 : 17);

    const largeScreen = useMediaQuery('(min-width: 512px)');
    // const largestScreen = useMediaQuery('(min-width: 700px)');
    
    return (
        <Container miw={rem(400)} className='loginCard' >
            <StandardCard pt={theme.spacing.xs} >
                <Text size='lg' weight={700} c={standardTitleColor(theme)} mb='sm'>
                    {type}
                </Text>
                {type === '注册' ? (
                    <form
                        onSubmit={registerForm.onSubmit(async (data) => {
                            const value = await handleRegister(data);
                            if (value.status === 'success') {
                                toast.success('🎉 All Done! 您的帐号已经准备就绪。');
                            } else {
                                toast.error(`${registerError[value.type || ''] || '未知错误'}${registerError[value.param || 'default'] ||''} `)
                            }
                            console.info('技术参数');
                            console.info(value);
                            if (value.status === 'success') {
                                setTimeout(() => {
                                    if (window.web?.disableJump !== true) {
                                        location.href = '/login';
                                    } else {
                                        toast.success('已忽略请求。');
                                    }
                                }, 2000);
                            }
                        })}
                    >
                        <input name='operation' className={classes.nodisplay} value={'createUI'} />
                        <Stack>
                            <TextInput
                                name='username'
                                required={type === '注册'}
                                label='用户名'
                                placeholder='您的用户名'
                                {...registerForm.getInputProps('username')}
                            />
                            <TextInput name='email' required label='邮箱' placeholder='mail@example.com' {...registerForm.getInputProps('email')} />
                            
                            <Select
                                data={[
                                    {
                                        label: '男',
                                        value: 'male',
                                    },
                                    {
                                        label: '女',
                                        value: 'female',
                                    },
                                    {
                                        label: '其他',
                                        value: 'Other',
                                    }
                                ]}
                                required
                                label='性别'
                                name='gender'
                                styles={standardSelect}
                                {...registerForm.getInputProps('gender')}
                            />

                            <Box mx='0'>
                                <Popover
                                    opened={popoverOpened}
                                    position='bottom-start'
                                    width={largeScreen ? '20rem' : 'target'}
                                    transitionProps={{ transition: 'pop' }}
                                >
                                    <Popover.Target>
                                        <div onFocusCapture={() => setPopoverOpened(true)} onBlurCapture={() => setPopoverOpened(false)}>
                                            <PasswordInput
                                                required
                                                name='password'
                                                label='密码'
                                                placeholder='您的密码（要保密！）'
                                                {...registerForm.getInputProps('password')}
                                            />
                                        </div>
                                    </Popover.Target>
                                    <Popover.Dropdown>
                                        <Progress color={color} value={strength} size={5} mb='xs' />
                                        <PasswordRequirement label='至少 8 位密码' meets={registerForm.values.password.length >= 8} />
                                        <PasswordRequirement label='至多 36 位密码' meets={registerForm.values.password.length <= 36} />
                                        {checks}
                                    </Popover.Dropdown>
                                </Popover>
                            </Box>

                            <Checkbox
                                required={type === '注册'}
                                label='我同意用户条款'
                                checked={registerForm.values.terms}
                                {...registerForm.getInputProps('terms')}
                            />
                        </Stack>

                        <Group position='apart' mt='xl'>
                            <Anchor component='button' type='button' color='dimmed' onClick={() => toggle()} size='xs'>
                                返回登录
                            </Anchor>
                            <Button type='submit' radius='xl'>
                                {upperFirst(type)}
                            </Button>
                        </Group>
                    </form>
                ) : (
                    <form
                        onSubmit={loginForm.onSubmit(async (data) => {
                            const value = await handleLogin(data);
                            // if (!value.data || value.data?.token) {
                            //     value.status === 'error';
                            // }
                            if (value.status === 'success') {
                                toast.success('欢迎回来！即将返回首页。');
                            } else {
                                toast.error(`${loginError[value.type || ''] || '未知错误'}${loginError[value.param || 'default'] || ''}`);
                            }
                            console.info('技术参数');
                            console.info(value);
                            if (value.status === 'success') {
                                setTimeout(() => {
                                    if (window.web?.disableJump !== true) {
                                        location.href = '/';
                                    } else {
                                        toast.success('已忽略。');
                            
                                    }
                                }, 2000);
                                Cookies.set('token', value.data?.token || '');
                                localStorage.setItem('token', value.data?.token || '');
                            }
                        })}
                    >
                        <input name='operation' className={classes.nodisplay} value={'loginCheck'} />
                        <Stack>
                            <TextInput
                                name='email'
                                required
                                label='用户名 / 邮箱'
                                placeholder='mail@example.com'
                                {...loginForm.getInputProps('email')}
                            />

                            <PasswordInput
                                name='password'
                                required
                                label='密码'
                                placeholder='您的密码（要保密！）'
                                {...loginForm.getInputProps('password')}
                            />
                        </Stack>

                        <Group position='apart' mt='xl'>
                            <Anchor component='button' type='button' color='dimmed' onClick={() => toggle()} size='xs'>
                                {type === '注册' ? '已经有账号了? 点这里登录' : '还没有账号吗? 点这里注册'}
                            </Anchor>
                            <Button type='submit' radius='xl'>
                                {upperFirst(type)}
                            </Button>
                        </Group>
                    </form>
                )}
            </StandardCard>
        </Container>
    );
}
