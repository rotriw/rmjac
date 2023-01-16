import { useState } from 'react';
import {
  createStyles,
  Table,
  ScrollArea,
  UnstyledButton,
  Group,
  Text,
  Center,
  TextInput,
  Badge,
  clsx,
  useMantineTheme,
} from '@mantine/core';
import { keys } from '@mantine/utils';
import { IconSelector, IconChevronDown, IconChevronUp, IconSearch } from '@tabler/icons';

const useStyles = createStyles((theme) => ({
  th: {
    padding: '0 !important',
  },

  control: {
    width: '100%',
    padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,

    '&:hover': {
      backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
    },
  },

  icon: {
    width: 21,
    height: 21,
    borderRadius: 21,
  },

  header: {
    position: 'sticky',
    top: 0,
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
    transition: 'box-shadow 150ms ease',

    '&::after': {
      content: '""',
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      borderBottom: `1px solid ${
        theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[2]
      }`,
    },
  },
}));

interface RowData {
	score: number,
	id: string,
	name: string
}

interface TableSortProps {
  data: RowData[];
}

interface ThProps {
  children: React.ReactNode;
  reversed: boolean;
  sorted: boolean;
	width: string | number;
  onSort(): void;
}

function Th({ children, reversed, sorted, onSort, width }: ThProps) {
  const { classes } = useStyles();
  const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconSelector;
  return (
    <th className={classes.th} style={{width: width}}>
      <UnstyledButton onClick={onSort} className={classes.control}>
        <Group position="apart">
          <Text weight={500} size="sm" >
            {children}
          </Text>
          <Center className={classes.icon}>
            <Icon size={14} stroke={1.5} />
          </Center>
        </Group>
      </UnstyledButton>
    </th>
  );
}

function filterData(data: RowData[], search: string) {
  const query = search.toLowerCase().trim();
  return data.filter((item) =>
	  keys(data[0]).some((key) => typeof item[key] === 'string' && (item[key] as string).toLowerCase().includes(query))
  );
}

function sortData(
  data: RowData[],
  payload: { sortBy: keyof RowData | null; reversed: boolean; search: string }
) {
  const { sortBy } = payload;

  if (!sortBy) {
    return filterData(data, payload.search);
  }

  return filterData(
	[...data].sort((a, b) => {
		if (typeof a[sortBy] === 'number') {
			return !payload.reversed ? (+b[sortBy] - +a[sortBy]) : (+a[sortBy] - +b[sortBy]);
		}
		if (payload.reversed) {
			return (b[sortBy] as string).localeCompare(a[sortBy] as string);
		}
    	return (a[sortBy] as string).localeCompare(b[sortBy] as string);
    }),
    payload.search
  );
}

export function ListProblemNew({ data }: TableSortProps) {
  const [search, setSearch] = useState('');
  const [sortedData, setSortedData] = useState(data);
  const [sortBy, setSortBy] = useState<keyof RowData | null>(null);
  const [reverseSortDirection, setReverseSortDirection] = useState(false);

	const theme = useMantineTheme();
  const setSorting = (field: keyof RowData) => {
    const reversed = field === sortBy ? !reverseSortDirection : false;
    setReverseSortDirection(reversed);
    setSortBy(field);
    setSortedData(sortData(data, { sortBy: field, reversed, search }));
  };

	
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.currentTarget;
    setSearch(value);
    setSortedData(sortData(data, { sortBy, reversed: reverseSortDirection, search: value }));
  };

  const rows = sortedData.map((row) => (
    <tr key={row.id}>
      <td>{row.score >= 100 ? <Badge color='green'>AC</Badge> : row.score > 0 ? <Badge color='red'>WA</Badge> : <Badge color='blue'>NO</Badge> }</td>
      <td><a style={{textDecoration: 'none', color: theme.colors.indigo[5]}} href={`https://www.luogu.com.cn/problem/${row.id}`} target={'_blank'}>{row.id} {row.name}</a></td>
    </tr>
  ));
const { classes, cx } = useStyles();

  return (
    <div>
      <TextInput
        placeholder="在题单中搜索..."
        mb="md"
        icon={<IconSearch size={14} stroke={1.5} />}
		value={search}
		rightSectionWidth='35'
		rightSection={<Text size={12}>共{ rows.length }个结果&nbsp;&nbsp;</Text>}
        onChange={handleSearchChange}
      />
      <Table
        horizontalSpacing="md"
        verticalSpacing="xs"
        sx={{ tableLayout: 'fixed', minWidth: 700 }}
      >
        <thead className={cx(classes.header)}>
          <tr>
            <Th
              sorted={sortBy === 'score'}
			  width={'10%'}
              reversed={reverseSortDirection}
              onSort={() => setSorting('score')}
            >
				得分
            </Th>
            <Th
              sorted={sortBy === 'id'}
              reversed={reverseSortDirection}
			  width={'80%'}
              onSort={() => setSorting('id')}
            >
              题目
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows
          ) : (
			<tr>
				<td></td>			  
              <td>
                <Text weight={500} align="center">
                  未找到信息
                </Text>
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}