import Link from "next/link";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { StandardCard, TitleCard } from "@/components/card/card";
import { postList } from "@/api/server/api_training_todo";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function Page() {
	let todoCount = 0;
	let problemCount = 0;
	let todos: Awaited<ReturnType<typeof postList>>["todos"] = [];

	try {
		const resp = await postList();
		todos = resp.todos || [];
		todoCount = todos.length;
		problemCount = todos.reduce((acc, item) => acc + (item.problems?.length || 0), 0);
	} catch {
		todos = [];
		todoCount = 0;
		problemCount = 0;
	}

	return (
		<SidebarProvider>
			<AppSidebar path="" />
			<div className="p-5 bg-white w-full">
				<TitleCard title="首页" description="Home" />

				<StandardCard title="TODO 概览">
					<div className="flex items-center justify-between gap-4">
						<div className="text-sm text-neutral-700">
							当前共有 <span className="font-bold">{todoCount}</span> 个题单，
							<span className="font-bold"> {problemCount} </span>道题目。
						</div>
						<Button asChild>
							<Link href="/todo">管理 TODO List</Link>
						</Button>
					</div>
				</StandardCard>

				<StandardCard title="我的题单">
					{todos.length === 0 ? (
						<div className="text-sm text-muted-foreground">暂无题单，去创建第一个 TODO 吧。</div>
					) : (
						<div className="space-y-3">
							{todos.slice(0, 6).map((todo) => (
								<div key={todo.id} className="rounded-md border p-3">
									<div className="mb-2 flex items-center justify-between">
										<div className="flex items-center gap-2">
											<span className="text-sm font-medium">#{todo.id} {todo.description || "未命名题单"}</span>
											<span className="text-xs text-muted-foreground">{todo.color || "#6b7280"}</span>
										</div>
										<span className="text-xs text-muted-foreground">{todo.problems.length} 题</span>
									</div>
									<div className="flex flex-wrap gap-2">
										{todo.problems.slice(0, 4).map((problem) => (
											<Link
												key={problem.edge_id}
												href={`/problem/${problem.problem_iden}`}
												className="rounded border px-2 py-1 text-xs hover:bg-neutral-50"
											>
												{problem.problem_iden}
											</Link>
										))}
										{todo.problems.length > 4 ? (
											<span className="text-xs text-muted-foreground">+{todo.problems.length - 4}</span>
										) : null}
									</div>
								</div>
							))}
						</div>
					)}
				</StandardCard>
			</div>
		</SidebarProvider>
	);
}