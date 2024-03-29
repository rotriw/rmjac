import {
    Container,
    Space,
    Text,
    createStyles,
    Center,
    Accordion,
    Group,
    Grid,
    Code,
    Divider,
    Loader,
    Badge, Box, MantineSize
} from '@mantine/core';
import React from 'react';
import { Prism } from '@mantine/prism';
import { NoStyleCard, StandardCard } from '../components/card';
import { standardTitleColor } from '../styles/color';
// import { notifications } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';
// import { IconX, IconCheck, IconInfoSmall, IconClock, IconCircle, IconServer, IconArchive, IconLoader, IconLoader2, IconLoader3 } from '@tabler/icons-react';
// import { alarm } from '../styles/alarm';
// import { random } from 'lodash';
// import { io } from 'socket.io-client';
// import * as MyPromise from 'some-promise-lib';



// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useStyles = createStyles((theme) => ({}));

const codes = `
    #include <cstdio>
#include <vector>
using namespace std;

const long long mod = 998244353;
const int maxn = 500010;
vector<int> G[maxn];
int fa[maxn], dep[maxn], to[maxn];
inline long long solve(void);
void dfs(int);
int n;

int main() {
    freopen("destiny.in", "r", stdin);
    freopen("destiny.out", "w", stdout);
    scanf("%d", &n);
    for (int i = 1, x, y; i < n; i++) {
        scanf("%d %d", &x, &y);
        G[x].push_back(y);
        G[y].push_back(x);
    }
    dfs(1);
    int m;
    scanf("%d", &m);
    while (m--) {
        int u, v;
        scanf("%d %d", &u, &v);
        to[v] = max(to[v], dep[u] + 1);
    }
    printf("%lld\n", solve());
    return 0;
}

void dfs(const int u) {
    for (int i : G[u])
        if (i != fa[u])
            fa[i] = u, dep[i] = dep[u] + 1, dfs(i);
    return;
}

struct node {
    int ls, rs;
    long long A, M = 1;
};
node t[maxn << 6];
int dp[maxn], cnt;

inline void mark(const int l, const int r, int& u, const long long A, const long long M) {
    if (!u) u = ++cnt;
    t[u].A = (t[u].A * M + A) % mod, t[u].M = t[u].M * M % mod;
    return;
}

inline void pushdown(const int l, const int r, const int u) {
    if (!t[u].A && t[u].M == 1) return;
    int mid = (l + r) >> 1;
    mark(l, mid, t[u].ls, t[u].A, t[u].M);
    mark(mid + 1, r, t[u].rs, t[u].A, t[u].M);
    t[u].A = 0, t[u].M = 1;
    return;
}

void add(const int l, const int r, int& u, const int L, const int R, const long long x) {
    if (R < l || r < L) return;
    if (L <= l && r <= R) {
        mark(l, r, u, x, 1);
        return;
    }
    if (!u) u = ++cnt;
    int mid = (l + r) >> 1;
    pushdown(l, r, u);
    add(l, mid, t[u].ls, L, R, x);
    add(mid + 1, r, t[u].rs, L, R, x);
    return;
}

long long query(const int l, const int r, const int u, const int p) {
    if (!u || p < l || r < p) return 0;
    if (l == r) return t[u].A;
    int mid = (l + r) >> 1;
    pushdown(l, r, u);
    return query(l, mid, t[u].ls, p) | query(mid + 1, r, t[u].rs, p);
}

void merge(const int l, const int r, int& u, int v) {
    if (!u || !v) {
        u = 0;
        return;
    }
    if (!t[u].ls && !t[u].rs) {
        mark(l, r, v, 0, t[u].A), u = v;
        return;
    }
    if (!t[v].ls && !t[v].rs) {
        mark(l, r, u, 0, t[v].A);
        return;
    }
    int mid = (l + r) >> 1;
    pushdown(l, r, u), pushdown(l, r, v);
    merge(l, mid, t[u].ls, t[v].ls);
    merge(mid + 1, r, t[u].rs, t[v].rs);
    return;
}

void solve(const int u) {
    add(0, n, dp[u], to[u], dep[u], 1);
    for (int i : G[u])
        if (i != fa[u]) {
            solve(i);
            add(0, n, dp[i], 0, n, query(0, n, dp[i], dep[i]));
            merge(0, n, dp[u], dp[i]);
        }
    return;
}

inline long long solve(void) {
    solve(1);
    return query(0, n, dp[1], 0);
}
`;


export function SubmissionResultPage() {
    const { theme } = useStyles();

    // function randomInRange(min, max) {
    //     return Math.random (max - min) + min;
    // }

    // confetti({
    //     particleCount: 50,
    //     spread: 130,
    //     ticks: 450,
    //     // angle: 90,
    //     // decay: 0.95,
    //     colors: [theme.colors.green[6], theme.colors.pink[4]],
    //     startVelocity: 30,
    //     origin: { x: randomInRange(0.3, 0.5), y: 0 },
    // });
    // confetti({
    //     particleCount: 50,
    //     spread: 130,
    //     // angle: 90,
    //     // decay: 0.65,
    //     ticks: 450,
    //     colors: [theme.colors.green[6], theme.colors.pink[4]],
    //     // startVelocity: 30,
    //     origin: { x: randomInRange(0.4, 0.6), y: 0},
    // });

    // const socket = io({'path': '/ws/'});
    // socket.emit('qwq');
    return (
        <>
            <Container>
                {/* <Alert  icon={<IconAlertCircle size='1rem' />} title='注意' color='red'>
                    无权限发送
                </Alert> */}
                <Space h={1} />
                <Grid>
                    <Grid.Col span={9}>
                        <NoStyleCard
                            style={{
                                backgroundImage:
                                    'linear-gradient(45deg, rgba(172 255 154 / 31%) 0%, rgb(206 250 196 / 31%) 99%, rgba(250, 208, 196, 0.314) 100%)',
                            }} /* linear-gradient(45deg, rgb(154 179 255 / 31%) 0%, rgb(196 213 250 / 31%) 99%, rgba(250, 208, 196, 0.314) 100%) Waiting / Judge */
                            /*linear-gradient(45deg, rgb(34 69 175 / 31%) 0%, rgb(176 196 240 / 31%) 100%) TLE MLE*/
                            /*linear-gradient(45deg, rgb(176 93 255 / 31%) 0%, rgb(240 176 189 / 31%) 100%) RE */
                            /*linear-gradient(45deg, rgb(229 188 102 / 31%) 0%, rgb(255 205 0 / 31%) 100%) RMJSYSTEMERROR */
                            /*linear-gradient(45deg, rgb(139 189 232 / 31%) 0%, rgb(30 139 187 / 31%) 100%) ARCHIEVE */
                            /*linear-gradient(45deg, rgb(255 112 112 / 31%) 0%, rgb(252 61 61 / 31%) 100%) WA */
                        >
                            {/*<Text size={12}  fw={600} c={standardTitleColor(theme)}>*/}
                            {/*    评测结果*/}
                            {/*</Text>*/}
                            <Text fw={600} size={12} c={standardTitleColor(theme)}>评测记录 · 洛谷 P1221 · you</Text>
                            <Space h={20} />
                            <Text size={18} weight={600} c={standardTitleColor(theme)}>
                                <Center>
                                    <IconCheck stroke={3} width={15} />
                                    &nbsp;100 Accepted{' '}
                                </Center>
                            </Text>
                            <Space h={30} />
                        </NoStyleCard>
                        <Space h={10}></Space>
                        <StandardCard title='测试点详情'>
                            <Badge radius='sm' color={'green'} style={{textTransform: 'none'}} variant={'filled'}>Total</Badge>
                            &nbsp;
                            <Badge  radius='sm' color={'green'} style={{textTransform: 'none'}}>Subtask #1</Badge>
                            &nbsp;
                            <Space h={10} />
                            <Accordion
                                variant='contained'
                                styles={{
                                    label: {
                                        paddingTop: 8,
                                        paddingBottom: 8,
                                    },
                                }}
                            >
                                <Accordion.Item value='4'>
                                    <Accordion.Control>
                                        <Group grow>
                                            <Text color='dimmed' fw={700} size={13}>
                                                测试点 #1
                                            </Text>
                                            <Text color='green' fw={700} size={13}>
                                                <div style={{ alignItems: 'center', display: 'flex' }}>
                                                    <IconCheck stroke={3} width={13} />
                                                    &nbsp;Accepted{' '}
                                                </div>
                                            </Text>
                                            <Text color='dimmed' fw={700} size={12}>
                                                56ms
                                            </Text>
                                            <Text color='dimmed' fw={700} size={12}>
                                                780kb
                                            </Text>
                                            <Text color='dimmed' fw={700} size={12}>
                                                10 points
                                            </Text>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Text fw={700} size={13}>输入数据</Text>
                                        <Code block style={{backgroundColor: theme.colorScheme === 'dark' ? 'black' :  'white'}}>
                                            10 12
                                        </Code>
                                        <Space h={10} />
                                        <Text fw={700} size={13}>输出数据</Text>
                                        <Code block style={{backgroundColor: theme.colorScheme === 'dark' ? 'black' :  'white'}}>
                                            22
                                        </Code>
                                        <Space h={10} />
                                        <Text fw={700} size={13} >答案数据</Text>
                                        <Code block style={{backgroundColor: theme.colorScheme === 'dark' ? 'black' : 'white'}}>
                                            22
                                        </Code>
                                        <Space h={10} />
                                        <Text fw={700} size={13}>信息</Text>
                                        <Code block style={{backgroundColor: theme.colorScheme === 'dark' ? 'black' :  'white'}}>
                                            OK
                                        </Code>
                                    </Accordion.Panel>
                                </Accordion.Item>

                                <Accordion.Item value='2'>
                                    <Accordion.Control>
                                        <Group grow>
                                            <Text color='dimmed' fw={700} size={13}>
                                                汇总
                                            </Text>
                                            <Text color='green' fw={700} size={13}>
                                                <div style={{ alignItems: 'center', display: 'flex' }}>
                                                    <IconCheck stroke={3} width={13} />
                                                    &nbsp;Accepted{' '}
                                                </div>
                                            </Text>
                                            <Text color='dimmed' fw={700} size={12}>
                                                1200ms
                                            </Text>
                                            <Text color='dimmed' fw={700} size={12}>
                                                900kb
                                            </Text>
                                            <Text color='dimmed' fw={700} size={12}>
                                                10 points
                                            </Text>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>Colors, fonts, shadows and many other parts are customizable to fit your design needs</Accordion.Panel>
                                </Accordion.Item>
                                <Accordion.Item value='1'>
                                    <Accordion.Control>
                                        <Group grow>
                                            <Text color='dimmed' fw={700} size={13}>
                                                Subtask #1
                                            </Text>
                                            <Text color='blue' fw={700} size={13}>
                                                <div style={{ alignItems: 'center', display: 'flex' }}>
                                                    <Loader size={10}/>
                                                    &nbsp;Judging{' '}
                                                </div>
                                            </Text>
                                            <Text color='dimmed' fw={700} size={12}>
                                                ms
                                            </Text>
                                            <Text color='dimmed' fw={700} size={12}>
                                                77kb
                                            </Text>
                                            <Text color='dimmed' fw={700} size={12}>
                                                10 points
                                            </Text>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Center>
                                            <Text fw={700} size={12}>
                                                查看具体测试点信息请在上方选择对应Subtask
                                            </Text></Center>
                                        <Space h={7} />
                                        <Accordion
                                            variant='contained'
                                            styles={{
                                                label: {
                                                    paddingTop: 8,
                                                    paddingBottom: 8,
                                                },
                                            }}
                                        >
                                            {/* <Accordion.Item value='1'>
                                    <Accordion.Control>
                                        <Group grow>
                                            <Text color='dimmed' fw={700} size={13}>
                                                测试点 #1
                                            </Text>
                                            <Text color='green' fw={700} size={13}>
                                                <div style={{ alignItems: 'center', display: 'flex' }}>
                                                    <IconCheck stroke={3} width={13} />
                                                    &nbsp;Accepted{' '}
                                                </div>
                                            </Text>
                                            <Text color='dimmed' fw={700} size={12}>
                                                56ms
                                            </Text>
                                            <Text color='dimmed' fw={700} size={12}>
                                                780kb
                                            </Text>
                                            <Text color='dimmed' fw={700} size={12}>
                                                10 points
                                            </Text>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>Colors, fonts, shadows and many other parts are customizable to fit your design needs</Accordion.Panel>
                                </Accordion.Item>
                                */}
                                            <Accordion.Item value='3'>
                                                <Accordion.Control>
                                                    <Group grow>
                                                        <Text color='dimmed' fw={700} size={13}>
                                                            测试点 #1
                                                        </Text>
                                                        <Text color='green' fw={700} size={13}>
                                                            <div style={{ alignItems: 'center', display: 'flex' }}>
                                                                <IconCheck stroke={3} width={13} />
                                                                &nbsp;Accepted{' '}
                                                            </div>
                                                        </Text>
                                                        <Text color='dimmed' fw={700} size={12}>
                                                            1200ms
                                                        </Text>
                                                        <Text color='dimmed' fw={700} size={12}>
                                                            900kb
                                                        </Text>
                                                        <Text color='dimmed' fw={700} size={12}>
                                                            10 points
                                                        </Text>
                                                    </Group>
                                                </Accordion.Control>
                                                <Accordion.Panel>Colors, fonts, shadows and many other parts are customizable to fit your design needs</Accordion.Panel>
                                            </Accordion.Item>
                                            <Accordion.Item value='1'>
                                                <Accordion.Control>
                                                    <Group grow>
                                                        <Text color='dimmed' fw={700} size={13}>
                                                            测试点 #2
                                                        </Text>
                                                        <Text color='blue' fw={700} size={13}>
                                                            <div style={{ alignItems: 'center', display: 'flex' }}>
                                                                <Loader size={10}/>
                                                                &nbsp;Judging{' '}
                                                            </div>
                                                        </Text>
                                                        <Text color='dimmed' fw={700} size={12}>
                                                            ms
                                                        </Text>
                                                        <Text color='dimmed' fw={700} size={12}>
                                                            77kb
                                                        </Text>
                                                        <Text color='dimmed' fw={700} size={12}>
                                                            10 points
                                                        </Text>
                                                    </Group>
                                                </Accordion.Control>
                                                <Accordion.Panel>

                                                    <Text fw={700} size={12}>
                                                        In
                                                    </Text>
                                                </Accordion.Panel>
                                            </Accordion.Item>
                                        </Accordion>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            </Accordion>
                        </StandardCard>
                        <Space h={10}></Space>
                        <StandardCard title='代码'>
                            <Prism language='cpp' noCopy ff={'Fira Code'}>
                                {codes}
                            </Prism>
                        </StandardCard>
                    </Grid.Col>
                    <Grid.Col span={3}>
                        {/*<NoStyleCard>*/}
                        {/*    <Center><Text color={theme.colorScheme === 'dark' ? 'white' : theme.colors.gray[7]} fw={700} size={14}>洛谷 P1145</Text></Center>*/}
                        {/*</NoStyleCard>*/}
                        {/*<Space h={10} />*/}
                        {/*<StandardCard title={'提交用户'}>*/}
                        {/*    <Center><Badge w={'75%'} radius='sm' size={19 as unknown as MantineSize} color={'indigo'} style={{textTransform: 'none'}}>smallfang</Badge></Center>*/}
                        {/*</StandardCard>*/}
                        {/*<Space h={10} />*/}
                        <NoStyleCard>
                            <Group grow>
                                <Box>
                                    <Text tt="uppercase" fz="xs" c="dimmed" fw={700}>
                                        时间波峰
                                    </Text>
                                    <Group position="apart" align="flex-end" spacing={0}>
                                        <Text size={14} fw={300} >200ms</Text>
                                    </Group>
                                </Box>
                                <Box>
                                    <Text tt="uppercase" fz="xs" c="dimmed" fw={700}>
                                        时间平均
                                    </Text>
                                    <Group position="apart" align="flex-end" spacing={0}>
                                        <Text size={14} fw={300}>150ms</Text>
                                    </Group>
                                </Box>
                            </Group>
                        <Space h={10} />
                            <Group grow>
                                <Box>
                                    <Text tt="uppercase" fz="xs" c="dimmed" fw={700}>
                                        空间波峰
                                    </Text>
                                    <Group position="apart" align="flex-end" spacing={0}>
                                        <Text size={14} fw={300} >1.0 GB</Text>
                                    </Group>
                                </Box>
                                <Box>
                                    <Text tt="uppercase" fz="xs" c="dimmed" fw={700}>
                                        空间平均
                                    </Text>
                                    <Group position="apart" align="flex-end" spacing={0}>
                                        <Text size={14} fw={300}>750 MB</Text>
                                    </Group>
                                </Box>
                            </Group>
                            <Space h={10} />
                            <Group grow>
                                <Box>
                                    <Text tt="uppercase" fz="xs" c="dimmed" fw={700}>
                                        代码长度
                                    </Text>
                                    <Group position="apart" align="flex-end" spacing={0}>
                                        <Text size={14} fw={300} > 10KB</Text>
                                    </Group>
                                </Box>
                            </Group>
                        </NoStyleCard>
                        <Space h={10} />
                        <NoStyleCard>
                            <Group grow>
                                <Text color='dimmed' fw={700} size={'xs'}>
                                    提交时间
                                </Text>
                                <Text color='blue' fw={700} size={'xs'}>
                                    2023.06.14
                                </Text>
                            </Group>
                            <Space h={5}></Space>
                            <Divider />
                            <Space h={5}></Space>
                            <Group grow>
                                <Text color='dimmed' fw={700} size={'xs'}>
                                    原评测ID
                                </Text>
                                <Text color='blue' fw={700} size={'xs'}>
                                    11451400
                                </Text>
                            </Group>
                            <Group grow>
                                <Text color='dimmed' fw={700} size={'xs'}>
                                    RMJAC RID
                                </Text>
                                <Text color='blue' fw={700} size={'xs'}>
                                    100
                                </Text>
                            </Group>
                        </NoStyleCard>
                    </Grid.Col>
                </Grid>
            </Container>
        </>
    );
}
