import React from "react";
import "vditor/dist/index.css";
// import "vditor/src/assets/scss/index.scss";
import Vditor from "vditor";
import { useMantineTheme } from "@mantine/core";

export function MarkdownEdit({ vd, setVd, def, openPreview = false }: any) {
	const theme = useMantineTheme();
	React.useEffect(() => {
		const vditor = new Vditor("vditor", {
			theme: theme.colorScheme === 'dark' ? 'dark' : 'classic',
			preview: {
				theme: {
					'current': theme.colorScheme === 'dark' ? 'dark' : 'light',
				}
			},
			
			minHeight: 300,
			after: () => {
				vditor.setValue(def || '');
        		setVd(vditor);
				
				if (openPreview) {
					var evt = document.createEvent('Event');
					evt.initEvent('click', true, true);
					//@ts-ignore
					vditor.vditor.toolbar?.elements.preview.firstElementChild?.dispatchEvent(evt);
				}
			},
		
		});
		window.addEventListener("changetheme", function(e) {
			const nowtheme = localStorage.getItem('bgColor');
			vditor.setTheme(nowtheme === 'dark' ? 'dark' : 'classic', nowtheme === 'dark' ? 'dark' : 'light');
		});
		window.addEventListener("openchange", function(e) {
			var evt = document.createEvent('Event');
			evt.initEvent('click', true, true);
			//@ts-ignore
			vditor.vditor.toolbar?.elements.preview.firstElementChild?.dispatchEvent(evt);
		});
		//vditor.vditor.toolbar?.elements.preview.firstElementChild.dispatchEvent(evt);
	}, []);
	
	return <div id="vditor" className="vditor" />;
}