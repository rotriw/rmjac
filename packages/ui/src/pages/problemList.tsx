import { Container, Input, Space, Text } from '@mantine/core';
import React from 'react';
import { NoStyleCard } from '../components/card';
import { IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

export function ProblemList() {
    const {t} = useTranslation();
    return (<>
        <Container>
            <NoStyleCard>
                <Text fw={600} size={14}>{t('SearchProblem')}</Text>
                <Space h={5} />
                <Input
                    icon={<IconSearch stroke={2} size={14} />}
                    placeholder={t('SearchProblemDescription')}
                />
            </NoStyleCard>
        </Container>
    </>)
}