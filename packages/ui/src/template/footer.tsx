import {createStyles, Text, Container, ActionIcon, Group, useMantineTheme, Center} from '@mantine/core';
import React from "react";

const useStyles = createStyles((theme) => ({
    footer: {
        marginTop: 120,
        paddingTop: theme.spacing.xl * 2,
        paddingBottom: theme.spacing.xl * 2,
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[0],
        borderTop: `1px solid ${
            theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2]
        }`,
    },

    logo: {
        maxWidth: 200,

        [theme.fn.smallerThan('sm')]: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
        },
    },

    description: {
        marginTop: 5,

        [theme.fn.smallerThan('sm')]: {
            marginTop: theme.spacing.xs,
            textAlign: 'center',
        },
    },

    inner: {
        display: 'flex',
        justifyContent: 'space-between',

        [theme.fn.smallerThan('sm')]: {
            flexDirection: 'column',
            alignItems: 'center',
        },
    },

    groups: {
        display: 'flex',
        flexWrap: 'wrap',

        [theme.fn.smallerThan('sm')]: {
            display: 'none',
        },
    },

    wrapper: {
        width: 160,
    },

    link: {
        display: 'block',
        color: theme.colorScheme === 'dark' ? theme.colors.dark[1] : theme.colors.gray[6],
        fontSize: theme.fontSizes.sm,
        paddingTop: 3,
        paddingBottom: 3,

        '&:hover': {
            textDecoration: 'underline',
        },
    },

    title: {
        fontSize: theme.fontSizes.lg,
        fontWeight: 700,
        fontFamily: `Greycliff CF, ${theme.fontFamily}`,
        marginBottom: theme.spacing.xs / 2,
        color: theme.colorScheme === 'dark' ? theme.white : theme.black,
    },

    afterFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: theme.spacing.xl,
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.xl,
        borderTop: `1px solid ${
            theme.colorScheme === 'dark' ? theme.colors.dark[4] : theme.colors.gray[2]
        }`,

        [theme.fn.smallerThan('sm')]: {
            flexDirection: 'column',
        },
    },

    social: {
        [theme.fn.smallerThan('sm')]: {
            marginTop: theme.spacing.xs,
        },
    },

    grays: {
        color: theme.colorScheme === 'dark' ? theme.colors.gray[2] : theme.colors.gray[7],
    }
}));

interface FooterLinksProps {
    data: {
        title: string;
        links: { label: string; link: string }[];
    }[];
    colorScheme: Function;
    colorSchemeData: string;
}

export function FooterR({ data, colorScheme, colorSchemeData  }: FooterLinksProps) {
    const { classes } = useStyles();
    const theme = useMantineTheme();

    async function changeTheme() {
        colorScheme();
        await localStorage.setItem(`bgColor`, colorSchemeData === 'dark' ? 'light' : 'dark')
        let setItemEvent = new Event("changetheme");
        window.dispatchEvent(setItemEvent);

    }

    const groups = data.map((group) => {
        const links = group.links.map((link, index) => (
            <Text<'a'>
                key={index}
                className={classes.link}
                component="a"
                href={link.link}
                onClick={(event) => event.preventDefault()}
            >
                {link.label}
            </Text>
        ));

        return (
            <div className={classes.wrapper} key={group.title}>
                <Text className={classes.title}>{group.title}</Text>
                {links}
            </div>
        );
    });
    return (
        <footer className={classes.footer}>
            <Container className={classes.inner}>
                <div className={classes.logo}>
                    <Text size={21} fw={800}>Rmj.ac</Text>
                    <Text size="xs" color="dimmed" className={classes.description}>
                        A tool for OIer
                    </Text>
                </div>
                <div className={classes.groups}>{groups}</div>
            </Container>
            <Container className={classes.afterFooter}>
                <div style={{display: 'inline'}}>
                    <Center><Text color="dimmed" size="sm">
                    &copy;&nbsp;Rotriw Dev
                    </Text><Text color="dimmed" size="sm">
                        &nbsp;|&nbsp;
                    </Text>

                    <Text<'a'>
                        href='#'
                        onClick={(event) => { event.preventDefault();changeTheme();localStorage.setItem(`bgColor`, colorSchemeData === 'dark' ? 'light' : 'dark')}}
                        className={classes.link}
                    >设为{colorSchemeData === 'dark' ? '亮色' : '暗色'}模式
                    </Text></Center>
                </div>

                <Group spacing={0} className={classes.social} position="right" noWrap>
                    <Text className={classes.grays}>Version: 0.7.2</Text>
                </Group>
            </Container>
        </footer>
    );
}
