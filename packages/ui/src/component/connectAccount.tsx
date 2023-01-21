import {
    createStyles,
    Card,
    Group,
    Switch,
    Text,
    Input,
    Grid,
    Button,
    Image,
    Modal,
    UnstyledButton, Stepper, Badge
} from '@mantine/core';
import React, {useState} from "react";
import LuoguSVG from "../assets/luogu.svg";
import {IconCheck} from "@tabler/icons";
import {NavLink} from "react-router-dom";


const useStyles = createStyles((theme) => ({
    card: {
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
    },

    item: {
        '& + &': {
            paddingTop: theme.spacing.sm,
            marginTop: theme.spacing.sm,
            borderTop: `1px solid ${
                theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2]
            }`,
        },
    },

    switch: {
        '& *': {
            cursor: 'pointer',
        },
    },

    title: {
        lineHeight: 1,
    },
}));

interface AccountProps {
    data: {
        type: string;
        UID: string;
        username?: string;

    }[];
}

export function ConnectAccount({data} :AccountProps) {
    const { classes, theme } = useStyles();
    const items = data.map(item => (
        <>
            <Card bg={theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[0]} pt={15}>
              <Grid>
                  <Grid.Col span={1}>
                      {item.type == 'luogu' ? <Image width={15} src={LuoguSVG}></Image> : <div>UNK</div>}
                  </Grid.Col>
                  <Grid.Col span={8}>
                      <Text color="dimmed" weight={600}>
                          {item.UID}
                      </Text>
                  </Grid.Col>
                  <Grid.Col span={2}>
                        <Button variant={'default'}>
                            取消绑定
                        </Button>
                  </Grid.Col>
              </Grid>
            </Card>
        </>
    ));
    const [notify, setNotify] = useState(true);
    const [active, setActive] = useState(1);
    const nextStep = () => setActive((current) => (current < 3 ? current + 1 : current));
    const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));
    return (
        <>
            <Modal
                opened={notify}
                onClose={() => setNotify(false)}
                withCloseButton={false}
                centered

            >
                <div style={{textAlign: 'center', display: 'inline-block', width: '100%'}}>
                   <Text size={20} weight={800}>绑定账号</Text>
                    <div style={{marginTop: 15}} />
                    <Stepper active={active} onStepClick={setActive} breakpoint="sm" allowNextStepsSelect={false}>
                        <Stepper.Step>
                            <Grid>
                                <Grid.Col span={12} >
                                    <UnstyledButton onClick={()=>{nextStep()}}   bg={theme.colorScheme === 'dark' ? '#bac8ff30' : theme.colors.indigo[0]} style={{width: '100%', borderRadius: theme.radius.md}} p={15}>
                                        <Group>
                                            <div>
                                                <Text color={theme.colors.indigo[8]} weight={800}>绑定洛谷账号</Text>
                                                <Text size="xs" color="dimmed">通过验证加入洛谷账号</Text>
                                            </div>
                                            <div />
                                            <div />
                                        </Group>
                                    </UnstyledButton>
                                </Grid.Col>
                            </Grid>
                        </Stepper.Step>
                        <Stepper.Step>
                            <UnstyledButton onClick={()=>{nextStep()}}  bg={theme.colorScheme === 'dark' ? '#bac8ff30' : theme.colors.indigo[0]} style={{width: '100%', borderRadius: theme.radius.md}} p={15}>
                                <Group>
                                    <div>
                                        <Text color={theme.colors.indigo[8]} weight={800}>个人签名认证</Text>
                                        <Text size="xs" color="dimmed">通过短暂修改个人签名来验证</Text>
                                    </div>
                                    <div />
                                    <div />
                                </Group>
                            </UnstyledButton>
                            <div style={{marginTop: 5}} />
                            <UnstyledButton onClick={()=>{nextStep()}}  bg={theme.colorScheme === 'dark' ? '#ffd8a830' : theme.colors.orange[0]} style={{width: '100%', borderRadius: theme.radius.md}} p={15}>
                                <Group>
                                    <div>
                                        <Text color={theme.colors.orange[8]} weight={800}>个人剪切板认证</Text>
                                        <Text size="xs" color="dimmed">通过新建一个洛谷剪切板来认证</Text>
                                    </div>
                                    <div />
                                    <div />
                                </Group>
                            </UnstyledButton>
                        </Stepper.Step>
                        <Stepper.Step>
                            <Button onClick={()=>{nextStep()}} fullWidth variant='light'>
                                完成
                            </Button>
                        </Stepper.Step>
                        <Stepper.Completed>
                            <div style={{textAlign: 'center', display: 'inline-block', width: '100%'}}>
                                <div style={{padding: '0px'}}></div>
                                <h4>绑定完成</h4>
                                <Grid>
                                    <Grid.Col span={12} >
                                        <Button variant="light" color="red" fullWidth>暂时未完成</Button>
                                    </Grid.Col>
                                </Grid>
                            </div>
                        </Stepper.Completed>
                    </Stepper>

                </div>
            </Modal>
            <Card withBorder radius="md" p="xl" pt="md" className={classes.card}>
                <Input.Wrapper label={'绑定账号'} description={'链接到您的远程OJ账号'}>
                </Input.Wrapper>
                <div style={{marginTop: theme.spacing.sm}} />
                <Button>新建绑定</Button>
                <div style={{marginTop: theme.spacing.sm}} />
                {items}
            </Card>
        </>
    );
}
