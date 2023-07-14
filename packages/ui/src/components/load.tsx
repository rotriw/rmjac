import { Center, Text } from '@mantine/core';
import { NoStyleCard } from './card';
import React from 'react';

interface InfoLoadProp {
    waitingfor: string;
}

export function InfoLoad({ waitingfor }: InfoLoadProp) {
    return (
        <>
            <NoStyleCard>
                <Center>
                    <Text color='dimmed' fw={500} size={10}>
                        Waiting for {waitingfor}
                    </Text>
                </Center>
            </NoStyleCard>
        </>
    );
}