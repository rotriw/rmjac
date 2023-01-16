import { ClassNames } from '@emotion/react';
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
	createStyles,
	UnstyledButton
} from '@mantine/core';
import {IconPencil, IconTrash, IconArrowUpRight, IconCheck, IconX} from '@tabler/icons';
import React from "react";
import { Link } from "react-router-dom";


interface UsersTableProps {
    data: any[];
}

const useStyles = createStyles((theme) => ({

  control: {
    width: '100%',
    padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
    },
  },

}));

export function ListProblem({ data }: UsersTableProps) {
	const theme = useMantineTheme();
	const { classes } = useStyles();
    const rows = data.map((item) => (
        <tr key={item}>
            <td>
                <Badge color={item.score === 100 ? 'green': item.score > 0 ? 'red' : 'grey' }

                >
                    {item.score === 100 ? 'AC' : item.score > 0 ? 'WA': <>NO</> }
                </Badge>

            </td>
            <td>
                <a style={{textDecoration: 'none', color: theme.colors.indigo[5]}} target='_blank' href={`https://www.luogu.com.cn/problem/${item.id}`}>
                    <Group spacing="sm">
                    <Text size="sm" weight={500}>
                        {item.id} 
					{item.name}
					</Text>
                </Group></a>
            </td>
        </tr>
    ));

    return (
        <ScrollArea>
            <Table sx={{ minWidth: 600 }} verticalSpacing="xs" striped highlightOnHover  withColumnBorders>
                <thead>
                <tr>
					<th style={{ width: '5%', padding: '0 !important' }}>
						<UnstyledButton className={classes.control}>
							状态
						</UnstyledButton>
					</th>
                    <th style={{width: '75%'}}>题目</th>
                </tr>
                </thead>
                <tbody>{rows}</tbody>
            </Table>
        </ScrollArea>
    );
}
