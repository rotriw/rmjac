import { useState } from 'react';
import { Container, Group, Burger, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
// import { MantineLogo } from '@mantinex/mantine-logo';
import React from 'react';
import classes from './Navbar.module.css';
import { NavLink } from 'react-router-dom';


interface HeadersProps {
    links: { link: string; label: string }[];
    title: string;
    type: 'route' | 'direct';
}

export function NavBar({ links, title, type }: HeadersProps) {
    const [opened, { toggle }] = useDisclosure(false);
    const [linksOpened, { toggle: toggleLinks }] = useDisclosure(false);
    const [active, setActive] = useState(links[0].link);

    const items = links.map((link) => (
        <NavLink
            key={link.label}
            to={link.link}
            className={classes.link}
            data-active={active === link.link || undefined}
            onClick={(event) => {
                event.preventDefault();
                setActive(link.link);
            }}
        >
        {link.label}
        </NavLink>
    ));

    
    return (
        <header className={classes.header}>
            <Container size="md" className={classes.inner}>
                <Text c='blue' fw={700} size='lg'>Rmj.ac</Text>
                <Group gap={5} visibleFrom="xs">
                {items}
                </Group>

                <Burger opened={opened} onClick={toggle} hiddenFrom="xs" size="sm" />
            </Container>
        </header>
    );
}
