import React from "react";
import "vditor/dist/index.css";
// import "vditor/src/assets/scss/index.scss";
import Vditor from "vditor";
import { useMantineTheme } from "@mantine/core";

export function MarkdownShow({ md }: any) {
	const theme = useMantineTheme();
	React.useEffect(() => {
		const previewElement = document.getElementById("preview");
		console.log(previewElement);
		Vditor.preview(previewElement as any, md, {
			// cdn: "",
			mode: 'light',
			theme: {
				'current': theme.colorScheme === 'dark' ? 'dark' : 'light'
			},
			//mode: theme.colorScheme === 'dark' ? 'dark' : 'light',
			// theme: {
			// 	path: "/dist/css/content-theme",
			// },
			after() {
				window.addEventListener("changetheme", function(e) {
					const nowtheme = localStorage.getItem('bgColor');
					console.log('qwq');

					Vditor.setContentTheme(nowtheme === 'dark' ? 'dark' : 'light', 'https://unpkg.com/vditor@3.9.0/dist/css/content-theme/');
				});
			}
		});
	}, []);
	return <div id="preview" className="preview" />;
}
