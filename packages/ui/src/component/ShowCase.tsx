import { Tabs } from '@mantine/core';
import { IconPhoto, IconMessageCircle, IconSettings } from '@tabler/icons';
import React from "react";
import Markdown from "markdown-to-jsx";
import {ListProblem} from "./ListProblem";

export function ShowCase({problems, description, canSetting} :any) {
    const settings = canSetting ? (<Tabs.Tab value="settings">设置</Tabs.Tab>) : (<></>);
    return (
        <Tabs defaultValue="description" variant="pills"  >
            <Tabs.List>
                <Tabs.Tab value="description">简介</Tabs.Tab>
                <Tabs.Tab value="problems">内容</Tabs.Tab>
                {settings}
            </Tabs.List>
            <Tabs.Panel value="description" pt="xs">
                <Markdown>
                    {description}
                </Markdown>
            </Tabs.Panel>

            <Tabs.Panel value="problems" pt="xs">
                <ListProblem data={problems} />
            </Tabs.Panel>

        </Tabs>
    );
}
