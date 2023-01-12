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

export function LoginHandler() {
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
                <TextInput label="用户名" placeholder="" required />
                <PasswordInput label="密码" placeholder="" required mt="md" />
                <Button fullWidth mt="xl">
                    登录
                </Button>
            </Paper>
        </Container>
    );
}
