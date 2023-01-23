import {
    Avatar,
    Badge,
    Table,
    Group,
    Text,
    ActionIcon,
    Anchor,
    ScrollArea,
	useMantineTheme, Button,
	Card, Grid
} from '@mantine/core';
import { IconPencil, IconTrash, IconArrowUpRight, IconEye } from '@tabler/icons';
import React from "react";
import {Link} from "react-router-dom";

interface UsersTableProps {
    data: { listName: string; problemListLength: number; id: number }[];
}

export function ShowList({ data }: UsersTableProps) {
    const theme = useMantineTheme();
	const rows = data.map((item) => (
		<Card withBorder style={{backgroundColor: theme.colorScheme === 'dark' ? theme.colors.gray[8] : theme.colors.gray[0], margin: '7px', paddingTop: '4.5px', paddingBottom: '4.5px'}}>
			<Grid>
				<Grid.Col span={10}>
					<Link to={`/view/${item.id}`} style={{textDecoration: 'none'}}>
						<Text size="sm" weight={500} style={{textDecoration: 'none', color: theme.colors.indigo[5]}}>
							{item.listName}
						</Text>
					</Link>
				</Grid.Col>
				<Grid.Col style={{textAlign: 'right'}} span={2}>
					{item.problemListLength}题
				</Grid.Col>
			</Grid>
        </Card>
    ));

    return (
        <div>
            <div style={{ minWidth: 600 }} >
				{rows}
            </div>
        </div>
    );
}
