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
  BackgroundImage,
} from '@mantine/core';
import { keys } from '@mantine/utils';
import { IconSelector, IconChevronDown, IconChevronUp, IconSearch, IconCheck, IconX, IconAlignBoxLeftTop } from '@tabler/icons';
import { DiffcultBadge } from './difficult';

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
	name: string,
	diff: number
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
	withSort: boolean;
}

function Th({ children, reversed, sorted, onSort, width, withSort }: ThProps) {
  const { classes } = useStyles();
  const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconSelector;
  return (
    <th className={classes.th} style={{width: width}}>
      <UnstyledButton onClick={withSort ? onSort : ()=>{}} className={classes.control}>
        <Group position="apart">
          <Text weight={500} size="sm" >
            {children}
		  </Text>
			{withSort ? (
		<Center className={classes.icon}>
            <Icon size={12} stroke={1.5} />
          </Center>
		) : (<></>)}
        </Group>
      </UnstyledButton>
    </th>
  );
}

function filterData(data: RowData[], search: string) {
	const query = search.toLowerCase().trim();
	let res = data.filter((item) =>
		keys(data[0]).some((key) => typeof item[key] === 'string' && (item[key] as string).toLowerCase().includes(query))
	);
	if (search.includes(':ac')) {
		data.filter((item) => item.score === 100).map(item => res.push(item));
	}
	if (search.includes(':wa')) {
		data.filter((item) => item.score === 1).map(item => res.push(item));
	}
	if (search.includes(':no')) {
		data.filter((item) => item.score === 0).map(item => res.push(item));
	}
  return res;
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
		if (typeof a[sortBy] === 'undefined') {
			(a[sortBy] as any) = -1;
		}
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
	  <tr key={row.id} style={{
		//   backgroundColor: row.score >= 100 ? theme.colors.green[0] : row.score > 0 ? theme.colors.red[0] : theme.colors.indigo[0],
	  }}>
      <td>{row.score >= 100 ? <Text size={14} weight={800} color='green'>AC</Text> : row.score > 0 ? <Text size={14} weight={800} color='red'>WA</Text>  : <Text size={14} weight={800} color='indigo'>NO</Text>}</td>
      <td><a style={{textDecoration: 'none', color: theme.colors.indigo[5]}} href={`https://www.luogu.com.cn/problem/${row.id}`} target={'_blank'}>{row.id} {row.name}</a></td>
	  <td><Center><DiffcultBadge diff={row.diff}></DiffcultBadge></Center></td>
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
			  width={'9%'}
              reversed={reverseSortDirection}
              onSort={() => setSorting('score')}
			  withSort={false}
            >
				状态
            </Th>
            <Th
              sorted={sortBy === 'id'}
              reversed={reverseSortDirection}
			  width={'71%'}
              onSort={() => setSorting('id')}
			  withSort={true}
            >
              题目
            </Th>
			<Th
              sorted={sortBy === 'diff'}
			  width={'20%'}
              reversed={reverseSortDirection}
              onSort={() => setSorting('diff')}
			  withSort={true}
			>
			<Center>难度</Center>	  
				
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