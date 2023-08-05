import { Badge, Button, Card, Center, Container, Grid, Group, Image, Input, Menu, Space, Text, Textarea, UnstyledButton, createStyles, rem, useMantineTheme } from '@mantine/core';
import React, { useState } from 'react';
import { StandardCard } from '../components/card';
import { RichTextEditor, Link } from '@mantine/tiptap';
import { AnyExtension, Editor, useEditor } from '@tiptap/react';
import Highlight from '@tiptap/extension-highlight';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import SubScript from '@tiptap/extension-subscript';
import 'katex/dist/katex.min.css';
import Mathematics from '@tiptap-pro/extension-mathematics';
import { IconPlus } from '@tabler/icons-react';
import { IconChevronDown } from '@tabler/icons-react';
import { standardSelect } from '../styles/select';

export function EditorRich({ editor }: { editor: Editor | null }) {
    return (
        <RichTextEditor editor={editor}>
            <RichTextEditor.Toolbar sticky stickyOffset={50} style={{ zIndex: 1 }}>
                <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Bold />
                    <RichTextEditor.Italic />
                    <RichTextEditor.Underline />
                    <RichTextEditor.Strikethrough />
                    <RichTextEditor.ClearFormatting />
                    <RichTextEditor.Highlight />
                    <RichTextEditor.Code />
                </RichTextEditor.ControlsGroup>

                <RichTextEditor.ControlsGroup>
                    <RichTextEditor.H1 />
                    <RichTextEditor.H2 />
                    <RichTextEditor.H3 />
                    <RichTextEditor.H4 />
                </RichTextEditor.ControlsGroup>

                <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Blockquote />
                    <RichTextEditor.Hr />
                    <RichTextEditor.BulletList />
                    <RichTextEditor.OrderedList />
                    <RichTextEditor.Subscript />
                    <RichTextEditor.Superscript />
                </RichTextEditor.ControlsGroup>

                <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Link />
                    <RichTextEditor.Unlink />
                </RichTextEditor.ControlsGroup>

                <RichTextEditor.ControlsGroup>
                    <RichTextEditor.AlignLeft />
                    <RichTextEditor.AlignCenter />
                    <RichTextEditor.AlignJustify />
                    <RichTextEditor.AlignRight />
                </RichTextEditor.ControlsGroup>
            </RichTextEditor.Toolbar>

            <RichTextEditor.Content mih={150} />
        </RichTextEditor>
    );
}

const data = [
    { label: '中文', image: '' },
    { label: '英语', image: '' },
    { label: '日语', image: '' },
];

const useStyles = createStyles((theme: any, { opened }: { opened: boolean }) => ({
    control: {
        width: rem(100),
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${theme.spacing.xs} ${theme.spacing.md}`,
        borderRadius: theme.radius.sm,
        border: `${rem(1)} solid ${theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[2]}`,
        transition: 'background-color 150ms ease',
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[opened ? 5 : 6] : opened ? theme.colors.gray[0] : theme.white,
        '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[0],
        },
    },

    label: {
        fontWeight: 500,
        fontSize: theme.fontSizes.xs,
    },

    icon: {
        transition: 'transform 150ms ease',
        transform: opened ? 'rotate(180deg)' : 'rotate(0deg)',
    },
}));

export function LanguagePicker() {
    const [opened, setOpened] = useState(false);
    const { classes } = useStyles({ opened });
    const [selected, setSelected] = useState(data[0]);
    const items = data.map((item) => (
        <Menu.Item onClick={() => setSelected(item)} key={item.label}>
            {item.label}
        </Menu.Item>
    ));

    return (
        <Menu onOpen={() => setOpened(true)} onClose={() => setOpened(false)} radius='xs' width='target' withinPortal  styles={standardSelect}>
            <Menu.Target>
                <UnstyledButton className={classes.control}>
                    <Group spacing='xs'>
                        {/* <Image src={selected.image} width={22} height={22} /> */}
                        <span className={classes.label}>{selected.label}</span>
                    </Group>
                    <IconChevronDown size='0.7rem' className={classes.icon} stroke={2} />
                </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>{items}</Menu.Dropdown>
        </Menu>
    );
}

export function ProblemEditor() {
    const editorBackGround = useEditor({
        extensions: [
            StarterKit,
            Mathematics,
            Underline as AnyExtension,
            Link,
            Superscript as AnyExtension,
            SubScript as AnyExtension,
            Highlight as AnyExtension,
            TextAlign.configure({ types: ['heading', 'paragraph'] }) as AnyExtension,
        ],
        content: '',
    });
    const editorStateMent = useEditor({
        extensions: [
            StarterKit,
            Mathematics,
            Underline as AnyExtension,
            Link,
            Superscript as AnyExtension,
            SubScript as AnyExtension,
            Highlight as AnyExtension,
            TextAlign.configure({ types: ['heading', 'paragraph'] }) as AnyExtension,
        ],
        content: '',
    });
    const editorInputFormer = useEditor({
        extensions: [
            StarterKit,
            Mathematics,
            Underline as AnyExtension,
            Link,
            Superscript as AnyExtension,
            SubScript as AnyExtension,
            Highlight as AnyExtension,
            TextAlign.configure({ types: ['heading', 'paragraph'] }) as AnyExtension,
        ],
        content: '',
    });
    const editorOutputFormer = useEditor({
        extensions: [
            StarterKit,
            Mathematics,
            Underline as AnyExtension,
            Link,
            Superscript as AnyExtension,
            SubScript as AnyExtension,
            Highlight as AnyExtension,
            TextAlign.configure({ types: ['heading', 'paragraph'] }) as AnyExtension,
        ],
        content: '',
    });
    const editorHint = useEditor({
        extensions: [
            StarterKit,
            Mathematics,
            Underline as AnyExtension,
            Link,
            Superscript as AnyExtension,
            SubScript as AnyExtension,
            Highlight as AnyExtension,
            TextAlign.configure({ types: ['heading', 'paragraph'] }) as AnyExtension,
        ],
        content: '',
    });
    const theme = useMantineTheme();
    return (
        <>
            <Container>
                <StandardCard title='创建题目' style={{ overflow: 'inherit' }}>
                    <Input.Wrapper id='input-title' withAsterisk label='题目标题' description='展示的题目标题（不带题号）'>
                        <Input id='input-title' placeholder='' />
                    </Input.Wrapper>
                    <Space h={5} />
                    <Input.Wrapper id='input-background' label='题目背景'>
                        <EditorRich editor={editorBackGround} />
                    </Input.Wrapper>
                    <Space h={5} />
                    <Input.Wrapper id='input-statement' label='题目陈述'>
                        <EditorRich editor={editorStateMent} />
                    </Input.Wrapper>
                    <Space h={5} />
                    <Input.Wrapper id='input-inputformer' label='输入格式'>
                        <EditorRich editor={editorInputFormer} />
                    </Input.Wrapper>
                    <Space h={5} />
                    <Input.Wrapper id='input-outputformer' label='输出格式'>
                        <EditorRich editor={editorOutputFormer} />
                    </Input.Wrapper>
                    <Space h={5} />
                    <Input.Wrapper id='input-testdata-all' label='输入输出样例'>
                        <Button
                            leftIcon={<IconPlus stroke={1.5} size={10} />}
                            variant='light'
                            color='gray'
                            radius='xs'
                            style={{ marginLeft: 10 }}
                            size={'xs'}
                            compact
                        >
                            添加一组
                        </Button>
                        <Space h={7} />
                        <Card radius={'xs'} bg={theme.colorScheme === 'dark' ? theme.colors.dark[7] : `${theme.colors.gray[0]}90`}>
                            <Grid>
                                <Grid.Col span={2}>
                                    <Text size={13} fw={500}>
                                        样例 #1
                                    </Text>
                                </Grid.Col>
                                <Grid.Col span={5}>
                                    <Textarea minRows={3} variant='default' placeholder='输入样例#1' label='' />
                                </Grid.Col>
                                <Grid.Col span={5}>
                                    <Textarea minRows={3} variant='default' placeholder='输出样例#1' label='' />
                                </Grid.Col>
                            </Grid>
                            <Grid>
                                <Grid.Col span={2}>
                                    <Text size={13} fw={500}>
                                        样例 #2
                                    </Text> 
                                </Grid.Col>
                                <Grid.Col span={5}>
                                    <Textarea minRows={3} variant='default' placeholder='输入样例#2' label='' />
                                </Grid.Col>
                                <Grid.Col span={5}>
                                    <Textarea minRows={3} variant='default' placeholder='输出样例#2' label='' />
                                </Grid.Col>
                            </Grid>
                        </Card>
                    </Input.Wrapper>
                    <Space h={5} />
                    <Input.Wrapper id='input-hint' label='提示'>
                        <EditorRich editor={editorHint} />
                    </Input.Wrapper>
                    <Space h={5} />
                    <Input.Wrapper id='input-language' label='标准题面语言'>
                        <LanguagePicker />
                    </Input.Wrapper>
                    <Space h={3} />
                    <Input.Wrapper id='input-hint-translate' description='如果需要翻译题面请先创建本题后再添加。'>
                    </Input.Wrapper>
                    <Space h={10} />
                    <Input.Wrapper id='input-submit' label=''>
                        <Button leftIcon={<IconPlus stroke={1.5} size={13} />} variant='light' color='indigo' radius='sm' size='xs'>
                            创建题目
                        </Button>
                    </Input.Wrapper>
                </StandardCard>
            </Container>
        </>
    );
}
