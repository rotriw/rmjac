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
    data: string[];
}

export function ListProblem({ data }: UsersTableProps) {
    const theme = useMantineTheme();
    console.log(data);
    const rows = data.map((item) => (
        <tr key={item}>
            <td>
                <Group spacing="sm">
                    <Text size="sm" weight={500}>
                        {item}
                    </Text>
                </Group>
            </td>

            <td>
                未爬取
            </td>
            <td>
                <Group spacing={0} position="right">
                    <a target='_blank' href={`https://www.luogu.com.cn/problem/${item}`}><Button leftIcon={<IconArrowUpRight />} variant="outline" size='xs'>
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
