import {createStyles, Table, ScrollArea, ActionIcon, useMantineTheme} from '@mantine/core';
import { useListState } from '@mantine/hooks';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {IconGripVertical, IconX} from '@tabler/icons';
import React from "react";

const useStyles = createStyles((theme) => ({
    item: {
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
    },

    dragHandle: {
        ...theme.fn.focusStyles(),
        width: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: theme.colorScheme === 'dark' ? theme.colors.dark[1] : theme.colors.gray[6],
    },
}));

interface DndTableProps {
    state :any[],
    handlers :any,
}

function eraser(data :any, state :any[], handlers :any) {

    let len = state.length;
    let v :any = [];
    for (let i = 0; i < len; i ++ ) {
        state[i] !== data ? v.push(state[i]) : {};
    }
    handlers.setState(v);

}

export function DndList({ state, handlers }: DndTableProps) {
    const { classes } = useStyles();
    const theme = useMantineTheme();

    const items = state.map((item, index) => (
        <Draggable key={item.id} index={index} draggableId={item.id}>
            {(provided) => (
                <tr className={classes.item} ref={provided.innerRef} {...provided.draggableProps}>
                    <td style={{ width: 40 }}>
                        <div className={classes.dragHandle} {...provided.dragHandleProps}>
                            <IconGripVertical size={18} stroke={1.5} />
                        </div>
                    </td>
                    <td style={{ width: '15%' }}> {item.id}</td>
                    <td>{item.name}</td>
                    <td style={{ width: '5%' }} className={'noLeft'}>
                        <ActionIcon color={'red'} onClick={() => {eraser(item, state, handlers)}}>
                            <IconX stroke={1.5} size={18} />
                        </ActionIcon>
                    </td>
                </tr>
            )}
        </Draggable>
    ));

    return (
        <ScrollArea.Autosize maxHeight={250} style={{ border: theme.colorScheme === 'dark' ? '1px solid #373A40'  : '1px solid #dee2e6'}}>
            <DragDropContext
                onDragEnd={({ destination, source }) =>
                    handlers.reorder({ from: source.index, to: destination?.index || 0 })
                }
            >
                <Table withColumnBorders>
                    <thead style={{position: 'sticky', top: '0', zIndex: '1', backgroundColor: theme.colorScheme === 'dark' ? '#1a1b1e' : '#fff'}}>
                    <tr style={{borderBottom: theme.colorScheme === 'dark' ? '1px solid #373A40'  : '1px solid #dee2e6'}}>
                        <th style={{ width: 40 }} />
                        <th style={{ width: '15%' }}>题号</th>
                        <th>题目名称</th>
                        <th style={{ width: '5%' }} className={'noLeft'}></th>
                    </tr>
                    </thead>
                    <Droppable droppableId="dnd-list" direction="vertical" >
                        {(provided) => (
                            <tbody  {...provided.droppableProps} ref={provided.innerRef}>
                            {items}
                            {provided.placeholder}
                            </tbody>
                        )}
                    </Droppable>
                </Table>

            </DragDropContext>
        </ScrollArea.Autosize>
    );
}
