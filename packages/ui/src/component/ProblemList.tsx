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
import { IconPencil, IconTrash, IconArrowUpRight } from '@tabler/icons';
import React from "react";
import {Link} from "react-router-dom";

interface UsersTableProps {
    data: { listName: string; problemList: Array<string>; id: number }[];
}

const contestColor: Record<string, string> = {
    running: 'blue',
    end: 'cyan',
    progress: 'pink',
};

export function ProblemList({ data }: UsersTableProps) {
    const theme = useMantineTheme();
    console.log(data);
    const rows = data.map((item) => (
        <tr key={item.listName}>
            <td>
                <Group spacing="sm">
                    <Text size="sm" weight={500}>
                        {item.listName}
                    </Text>
                </Group>
            </td>

            <td>
                {item.problemList.length - 1}
            </td>
            <td>
                <Group spacing={0} position="right">
                    <Link to={`/view/${item.id}`}><Button leftIcon={<IconArrowUpRight />} variant="outline" size='xs'>
                        前往
                    </Button></Link>
                </Group>
            </td>
        </tr>
    ));

    return (
        <ScrollArea>
            <Table sx={{ minWidth: 600 }} verticalSpacing="xs" striped highlightOnHover  withColumnBorders>
                <thead>
                <tr>
                    <th style={{width: '55%'}}>题单名称</th>
                    <th style={{width: '30%'}} >题目数</th>
                    <th>操作</th>
                </tr>
                </thead>
                <tbody>{rows}</tbody>
            </Table>
        </ScrollArea>
    );
}
