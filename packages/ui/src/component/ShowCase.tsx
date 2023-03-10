import {
    Button,
    Container,
    createStyles,
    Divider,
    Grid,
    Group,
    Input,
    Progress,
    Tabs,
    useMantineTheme
} from '@mantine/core';
import {
    IconPhoto,
    IconMessageCircle,
    IconSettings,
    IconChecklist,
    IconArrowUpRight,
    IconCheck,
    IconX, IconTemperatureMinus
} from '@tabler/icons';
import React, {useState} from "react";
import Markdown from "markdown-to-jsx";
import { ListProblem } from "./ListProblem";
import { ListProblemNew } from "./ListProblemNew";
import {DndList} from "./DnDChangeProblemList";
import {getHotkeyHandler, useListState, useToggle} from "@mantine/hooks";
import Vditor from "vditor";
import axios from "axios";
import './showCase.css';
import {useNavigate} from "react-router-dom";
import {useParams} from "react-router-dom";
import {NotFound} from "./404NotFoundView";
import {NoAccess} from "./NOAccess";
import { MarkdownEdit } from './vditor';
import { MarkdownShow } from './ShowMarkdown';
import {PERMControl} from "./PERMControl";


const useStyles = createStyles((theme) => ({
    header: {
        paddingTop: theme.spacing.sm,
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
        borderBottom: `1px solid ${
            theme.colorScheme === 'dark' ? 'transparent' : theme.colors.gray[2]
        }`,
        marginBottom: 25,
    },

    mainSection: {
        paddingBottom: theme.spacing.sm,
    },

    user: {
        color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
        padding: `${theme.spacing.xs}px ${theme.spacing.sm}px`,
        borderRadius: theme.radius.sm,
        transition: 'background-color 100ms ease',

        '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white,
        },

        [theme.fn.smallerThan('xs')]: {
            display: 'none',
        },
    },

    burger: {
        [theme.fn.largerThan('xs')]: {
            display: 'none',
        },
    },

    userActive: {
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[8] : theme.white,
    },

    tabs: {
        [theme.fn.smallerThan('sm')]: {
            display: 'none',
        },
    },

    tabsList: {
        borderBottom: '0 !important',
    },

    tab: {
        fontWeight: 500,
        height: 38,
        backgroundColor: 'transparent',

        '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[1],
        },

        '&[data-active]': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
            borderColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.colors.gray[2],
        },
    },
}));

async function changeOrder(data :any, pid :any) {
    let tdata = [];
    for (let i = 0; i < data.length; i ++ )
        tdata.push(data[i].id);
    let back = await axios.post(`${window.RMJ.baseurl}list`, {
        operation: 'updateProblem',
        id: localStorage.getItem('uid'),
        token: localStorage.getItem('token'),
        pid: pid,
        problem: tdata
    });
    window.location.href= tdata.length >= 100 ?`/view/${pid}/fastview` : `/view/${pid}/problems`;
}

async function updateContent(data: any, pid: any) {
	let back = await axios.post(`${window.RMJ.baseurl}list`, {
        operation: 'updateDescription',
        id: localStorage.getItem('uid'),
        token: localStorage.getItem('token'),
        pid: pid,
        description: data
    });
	alert('?????????????????????');
}

function addDatas(inp :string, cInp :Function, H :any, cH :any) {
    let s = inp.replace('???', ',');
    let len = s.length;
    let v = H, vs = '';
    for (let i = 0; i < len; i ++ ) {
        if (inp[i] === ',' || inp[i] === ' ') {
            if (vs !== '') {
                v.push({id: vs, name: '????????????????????????????????????'});
                vs = '';
            }
        } else {
            vs += inp[i];
        }
    }
    if (vs !== '') {
        v.push({id: vs, name: '????????????????????????????????????'});
    }
    cH.setState(v);
    cInp('');
}


function changeD() {
	let setItemEvent = new Event("openchange");
	window.dispatchEvent(setItemEvent);
}

export function ShowCase({listName, problems, page, description, canSetting, pid, Perm, permsData} :any) {
    const settings = canSetting ? (<Tabs.Tab value="settings">??????</Tabs.Tab>) : (<></>);
    const fastview = problems.length > 100 ? (<Tabs.Tab value="fastview">????????????</Tabs.Tab>) : (<></>);
    const [state, handlers] = useListState(problems);
    const [input, cInput] = useState('');
    //const theme = useMantineTheme();
    const { classes, theme, cx } = useStyles();
	const [showSetDescriptionText, setShowSetDescriptionText] = useToggle(['????????????']);

	const [vd, setVd] = React.useState<Vditor>();
    const navigate = useNavigate();
    let value = (<></>);
    let tac: any = [];
    problems.map((item: any) => {
        // console.log(item.score);
        if (tac[item.score])
            tac[item.score]++;
        else
            tac[item.score] = 1;
    });

    const greenP = (tac[100] || 0) / problems.length * 100;
    const redP = (tac[1] || 0) / problems.length * 100;
    const blueP = (tac[0] || 0) / problems.length * 100;
    let showBar = ((tac[100] || 0) == problems.length) ? (
        <Progress
            size={20}
            sections={[
                { value: greenP, className: 'allDone', color: 'green', label: 'Done', tooltip: `All Accepted - ${(tac[100] || 0)} ` },
            ]}
        />) : (
        <Progress
            size={20}
            sections={[
                { value: greenP , color: 'green', label: 'AC', tooltip: `Accepted - ${(tac[100] || 0)} ` },
                { value: redP, color: 'red', label: 'WA', tooltip: `ERROR(WA,TLE,MLE,RE) - ${(tac[1] || 0)}` },
                { value: blueP, color: 'gray', label: 'NO', tooltip: `No status - ${(tac[0] || 0)}` },
            ]}
        />);
    if (page === 'problems') {
        value = (
            <>
                <ListProblemNew data={problems} />
            </>
        );
    } else if (page === 'settings') {
        if (canSetting === false) {
            value = (<NoAccess id={pid} />)
        } else
			value = (
				<>
					<div style={{marginTop: theme.spacing.sm}}></div>
					<Tabs defaultValue="problem" variant='pills'>
						<Tabs.List>
							<Tabs.Tab value="problem">????????????</Tabs.Tab>
							<Tabs.Tab value="description">????????????</Tabs.Tab>
                            <Tabs.Tab value="perm">????????????</Tabs.Tab>
						</Tabs.List>
						<Tabs.Panel pl="xs"  value="problem" pt="xs">
							<Input.Wrapper label='??????' description='????????????????????????????????????????????????'>
								<div style={{marginTop: '2px'}} />
								<Grid>
									<Grid.Col span={10}>
										<Input
											style={{marginTop: '0px'}}
											icon={<IconChecklist />}
											placeholder="??????ID"
											value = {input}
											onChange={(event) => {cInput(event.currentTarget.value)}}
											onKeyDown={getHotkeyHandler([
												['Enter', () => {addDatas(input, cInput, state, handlers)}],
											])}
										/>
									</Grid.Col>
									<Grid.Col span={2}>
										<Button style={{height: '36px'}} onClick={()=> {
											addDatas(input, cInput, state, handlers);
										}} fullWidth>??????</Button>
									</Grid.Col>
								</Grid>
							</Input.Wrapper>
							<Input.Wrapper label='????????????' description='????????????????????????'>
								<div style={{padding: '4px'}} />
								<Button color='red' variant='light' style={{height: '36px'}} onClick={()=> {
									handlers.setState([])
								}} fullWidth>??????</Button>
								<div style={{padding: '4px'}} />
								<DndList state={state} handlers={handlers}></DndList>
							</Input.Wrapper>
							<div style={{marginTop: '15px'}} />
							<Button fullWidth onClick={() => {changeOrder(state, pid)}}>????????????</Button>
						</Tabs.Panel>
						<Tabs.Panel pl="xs"  value="description" pt="xs">
							<MarkdownEdit def={description} vd={vd} setVd={setVd}  openPreview={false} />
							<div style={{ marginTop: theme.spacing.sm }}></div>
							<Button onClick={() => {
									// setShowSetDescriptionText();
									if (showSetDescriptionText === '????????????') {
										updateContent(vd?.getValue(), pid);
									}
									// changeD();
								}} >{showSetDescriptionText}</Button>
						</Tabs.Panel>
                        <Tabs.Panel pl="xs"  value="perm" pt="xs">
                            {Perm.includes('user') ? <PERMControl token={localStorage.getItem('token') as string} id={localStorage.getItem('uid') as string} pid={pid} data={permsData} /> : <NoAccess id={pid}  />}
                        </Tabs.Panel>
				</Tabs>

			</>);
    } else if (page === 'fastview') {
        const {viewed} = useParams();
        // @ts-ignore
        const showNoStyle = problems.map((item) => (
            <>
                <span style={{color: item.score === 100 ? 'green': item.score > 0 ? 'red' : 'grey', fontWeight: 800}}>    {item.score === 100 ? 'Accepted' : item.score > 0 ? 'ERROR': <>NO STATUS</> }
                  </span> {item.id} {item.name} <a target='_blank' href={`https://www.luogu.com.cn/problem/${item.id}`}>href</a> <br />
            </>
        ));
        value = (
          <Container sx={{ fontFamily: 'monospace'}} style={{paddingTop: 15}}>
                <div style={{backgroundColor: theme.colors.gray[2], maxHeight: 500, overflowY: "scroll"}} >
                    {showNoStyle}
                </div>
          </Container>
        );
	} else {
        value = (
			<>
                <Grid>
                    <Grid.Col md={9} lg={9} xl={9}>
                        <MarkdownShow md={description}></MarkdownShow>
                    </Grid.Col>
                    <Grid.Col md={3} lg={3} xl={3}>
						<span style={{ color: theme.colors.gray[6], fontSize: theme.fontSizes.sm, fontWeight: 600 }}>????????????</span>
						<div style={{marginTop: theme.spacing.sm}}></div>
                        {showBar}
                        <Divider my="sm" />
                        <span style={{color: theme.colors.gray[6], fontSize: theme.fontSizes.sm, fontWeight: 600}}>????????????</span> <br />
                        <span style={{color: theme.colors.gray[7], fontSize: theme.fontSizes.xs, fontWeight: 500}}>???????????????{pid}</span> <br />
                        <span style={{color: theme.colors.gray[7], fontSize: theme.fontSizes.xs, fontWeight: 500}}>????????????????????????
                            <br />
                            <span style={{fontWeight: 500}}>
                                ??????????????????{Perm.includes('view') ? <IconCheck color={'green'} size={10} /> : <IconX color={'red'} size={10} /> }<br />
                                ?????????????????????{Perm.includes('title') ? <IconCheck color={'green'} size={10} /> : <IconX color={'red'} size={10} /> }<br />
                                ???????????????{Perm.includes('delete') ? <IconCheck color={'green'} size={10} /> : <IconX color={'red'} size={10} /> }<br />
                                ?????????????????????{Perm.includes('problem') ? <IconCheck color={'green'} size={10} /> : <IconX color={'red'} size={10} /> }<br />
                                ?????????????????????{Perm.includes('description') ? <IconCheck color={'green'} size={10} /> : <IconX color={'red'} size={10} /> }<br />
                            </span>
                        </span>
                        <br />


                    </Grid.Col>
                </Grid>
			</>);
    }

    return (
        <>
        <div className={classes.header}>
        <Container className={classes.mainSection}>
            <Group position="apart">
                {listName}
            </Group>
        </Container>
        <Container>
            <Tabs
                defaultValue="description"
                variant="outline"
                classNames={{
                    root: classes.tabs,
                    tabsList: classes.tabsList,
                    tab: classes.tab,
                }}
                value={page}
                onTabChange={(value) => window.location.href=`/view/${pid}/${value}`}
            >
                <Tabs.List>
                    <Tabs.Tab value="description">??????</Tabs.Tab>
                    <Tabs.Tab value="problems">??????</Tabs.Tab>
                    {fastview}
                    {settings}
                </Tabs.List>
            </Tabs>
        </Container>
        </div>

            <Container>{value}</Container>
        </>
    );
}
