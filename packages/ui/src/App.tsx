import { MantineProvider, Text } from '@mantine/core';

export default function App() {
    return (
        <MantineProvider withGlobalStyles withNormalizeCSS>
            <Text>UI</Text>
        </MantineProvider>
    );
}
