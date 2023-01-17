import {
    Badge,
} from '@mantine/core';

export function DiffcultBadge({diff} :any) {
	let color = '', description = '', cdiff = String(diff), sizes = 'md';
	if (cdiff === '0') {
		color = 'grey';
		description = '暂无评定';
	} else if (cdiff === '1') {
		color = 'red';
		description = '入门';
	} else if (cdiff === '2') {
		color = 'orange';
		description = '普及-';
	} else if (cdiff === '3') {
		color = 'yellow';
		description = '普及/提高-';
	} else if (cdiff === '4') {
		color = 'green';
		description = '普及+/提高';
	} else if (cdiff === '5') {
		color = 'blue';
		description = '提高+/省选-';
	} else if (cdiff === '6') {
		color = 'grape';
		description = '省选/NOI-';
	} else if (cdiff === '7') {
		color = 'dark';
		description = 'NOI/NOI+/CTSC';
		// sizes = 'xs';
	} else {
		color = 'grey';
		description = '未知错误';
	}
	return (<Badge size={sizes as any} variant='filled' color={color} radius={'sm'}>{description}</Badge>);
}