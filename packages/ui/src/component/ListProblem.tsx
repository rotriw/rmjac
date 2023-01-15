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
} from '@mantine/core';
import {IconPencil, IconTrash, IconArrowUpRight, IconCheck, IconX} from '@tabler/icons';
import React from "react";
import {Link} from "react-router-dom";

interface UsersTableProps {
    data: any[];
}

export function ListProblem({ data }: UsersTableProps) {
    const theme = useMantineTheme();
    const rows = data.map((item) => (
        <tr key={item}>
            <td>
                <Badge color={item.score === 100 ? 'green': item.score > 0 ? 'red' : 'grey' }

                >
                    {item.score === 100 ? 'AC' : item.score > 0 ? 'WA': <>NO</> }
                </Badge>

            </td>
            <td>
                <Group spacing="sm">
                    <Text size="sm" weight={500}>
                        {item.id}
                    </Text>
                </Group>
            </td>

            <td>
                {item.name}
            </td>
            <td>
                <Group spacing={0} position="right">
                    <a target='_blank' href={`https://www.luogu.com.cn/problem/${item.id}`}><Button leftIcon={<IconArrowUpRight />} variant="outline" size='xs'>
                        前往
                    </Button></a>
                </Group>
            </td>
        </tr>
    ));

    return (
        <ScrollArea>
            <Table sx={{ minWidth: 600 }} verticalSpacing="xs" striped highlightOnHover  withColumnBorders>
                <thead>
                <tr>
                    <th style={{width: '5%'}}>STATUS</th>
                    <th style={{width: '15%'}}>题目ID</th>
                    <th style={{width: '55%'}} >题目名称</th>
                    <th>操作</th>
                </tr>
                </thead>
                <tbody>{rows}</tbody>
            </Table>
        </ScrollArea>
    );
}
