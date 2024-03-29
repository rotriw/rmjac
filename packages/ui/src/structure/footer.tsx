import { Button, Container, Flex, Footer, Group, Space, Text, rem, useMantineTheme } from '@mantine/core';
import { useToggle } from '@mantine/hooks';
import { IconBrandGithub, IconSun, IconMoon } from '@tabler/icons-react';
// import { t } from 'i18next';
import React, { useEffect } from 'react';
import i18n from '../utils/i18n';
import { useTranslation } from 'react-i18next';

export function AppFooter({ onThemeChange }: { onThemeChange: () => void }) {
    const theme = useMantineTheme();

    const [displaysStyles, cgDisplaysStyles] = useToggle(['', 'none']);
    const {t} = useTranslation();
    useEffect(() => {
        function changeFooter() {
            cgDisplaysStyles();
        }
        window.addEventListener('changeFooter', changeFooter);

        return () => {
            window.removeEventListener('changeFooter', changeFooter);
        };
    }, []);

    return (
        <Footer
            withBorder={false}
            styles={{
                root: {
                    position: 'relative',
                    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : 'white',
                },
            }}
            fixed={false}
            height='auto'
            p='md'
            style={{
                display: displaysStyles,
            }}
        >
            <Container>
                <Flex justify='space-between' align='center' direction='row'>
                    <div>
                        {/* <Text size={21.5}>开源</Text> */}
                        <Group spacing='xs' mt={rem('4px')} ml={rem('-2px')}>
                            <Button
                                onClick={() => {
                                    location.href = 'https://github.com/rotriw/rmjac';
                                }}
                                leftIcon={<IconBrandGithub size={13} />}
                                variant='light'
                                color='gray'
                                radius='xs'
                                size='xs'
                                compact
                            >
                                Github Repo
                            </Button>
                            <Button
                                onClick={onThemeChange}
                                leftIcon={
                                    <>
                                        <IconSun
                                            size={16}
                                            display={(() => {
                                                if (localStorage.getItem('colorScheme') === 'light') {
                                                    return 'none';
                                                }
                                            })()}
                                        />
                                        <IconMoon
                                            size={16}
                                            display={(() => {
                                                if (localStorage.getItem('colorScheme') === 'dark') {
                                                    return 'none';
                                                }
                                            })()}
                                        />
                                    </>
                                }
                                variant='light'
                                color='gray'
                                radius='xs'
                                size='xs'
                                compact
                            >
                                Change Style
                            </Button>

                            <Button
                                // leftIcon={<IconBrandGithub size={13} />}
                                variant='light'
                                color='gray'
                                radius='xs'
                                size='xs'
                                compact
                                onClick={() => {i18n.changeLanguage('zh')}}
                            >
                                {t('changelanguage')}
                            </Button>
                        </Group>
                        <Space h={45}></Space>
                        <Text color='dimmed' fw={800} size={12.5}>
                            Rmj.ac
                        </Text>
                        <Text color='dimmed' fw={800} size={10}>
                            &copy; Rotriw 2023, Rmj.ac ver alpha
                        </Text>
                    </div>
                </Flex>
            </Container>
        </Footer>
    );
}
