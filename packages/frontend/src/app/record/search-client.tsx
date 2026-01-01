"use client"

import { useState, useEffect, useRef, useCallback } from "react";
import { TreeTable, TreeTableNode } from "@/components/table/treetable";
import { Input } from "@/components/ui/input";
import { listRecords } from "@/lib/api";
import { RecordStatus, RECORD_STATUS_COLOR_MAP_INTER, Icond } from "./[id]/shared";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { RecordRightSidebar } from "./rightbar";
import { TitleCard } from "@/components/card/card";

interface RecordEdge {
    id: number;
    u: number;
    v: number;
    record_node_id: number;
    record_status: RecordStatus;
    code_length: number;
    score: number;
    submit_time: string;
    platform: string;
}

interface RecordItem {
    edge: RecordEdge;
    problem_name: string;
    problem_iden: string;
    user_name: string;
    user_iden: string;
}

export default function RecordSearchClient() {
    const router = useRouter();
    const [records, setRecords] = useState<RecordItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef<IntersectionObserver | null>(null);
    const [filters, setFilters] = useState({
        user: "",
        problem: "",
        status: "all",
    });

    const fetchRecords = async (pageNum: number, isNewSearch: boolean = false) => {
        if (loading) return;
        setLoading(true);
        try {
            const query: Record<string, string | number> = {
                page: pageNum,
                per_page: 20,
            };
            if (filters.user) query.user = filters.user;
            if (filters.problem) query.problem = filters.problem;
            if (filters.status !== "all") {
                query.status = parseInt(filters.status);
            }

            const res = await listRecords(query);
            if (res && res.records) {
                if (isNewSearch) {
                    setRecords(res.records);
                } else {
                    setRecords(prev => [...prev, ...res.records]);
                }
                setHasMore(res.records.length === 20);
                if (res.total !== undefined) setTotal(res.total);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Failed to fetch records:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords(1, true);
    }, []);

    const handleSearch = () => {
        setPage(1);
        setHasMore(true);
        fetchRecords(1, true);
    };

    const lastElementRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => {
                    const nextPage = prevPage + 1;
                    fetchRecords(nextPage);
                    return nextPage;
                });
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    const treeData: TreeTableNode[] = records.map((item) => ({
        id: item.edge.id,
        background: RECORD_STATUS_COLOR_MAP_INTER[item.edge.record_status],
        onClick: () => router.push(`/record/${item.edge.record_node_id}`),
        content_title: (
            <div className="flex items-center gap-2 text-sm font-medium">
                <Icond size={4} status={item.edge.record_status} />
                <span className="font-bold">{item.edge.record_status}</span>
                <span className="opacity-70">#{item.edge.id}</span>
            </div>
        ),
        content: (
            <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-4 text-sm">
                    <span onClick={(e) => e.stopPropagation()}>用户: <Link href={`/user/${item.user_iden}`} className="hover:underline font-semibold">{item.user_name} ({item.user_iden})</Link></span>
                    <span onClick={(e) => e.stopPropagation()}>题目: <Link href={`/problem/${item.problem_iden.replace("problem", "")}`} className="hover:underline font-semibold">{item.problem_name} ({item.problem_iden.replace("problem", "")})</Link></span>
                    <span>分数: <span className="font-bold">{item.edge.score}</span></span>
                    <span>长度: {item.edge.code_length} B</span>
                    <span className="opacity-60">{new Date(item.edge.submit_time).toLocaleString()}</span>
                </div>
            </div>
        ),
    }));

    return (
        <SidebarProvider defaultOpen={true}>
            <div className="flex flex-1 flex-col lg:flex-row w-full min-h-screen">
                <div className="flex-1 p-6 space-y-6 min-w-0">
                    <TitleCard title="记录列表" description="查看所有提交记录" />
                    <div className="flex justify-end items-center">
                        <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            className="w-20 h-8"
                            placeholder="页码"
                            value={page}
                            onChange={(e) => {
                                const p = parseInt(e.target.value);
                                if (p > 0) {
                                    setPage(p);
                                    setHasMore(true);
                                    fetchRecords(p, true);
                                }
                            }}
                        />
                        <span className="text-sm font-medium opacity-60">页</span>
                    </div>
                </div>
                
                <TreeTable data={treeData} />

                {loading && (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
                    </div>
                )}

                <div ref={lastElementRef} className="h-10" />

                {records.length === 0 && !loading && (
                    <div className="text-center py-20 border rounded-md bg-muted/10 opacity-50">
                        未找到相关记录
                    </div>
                )}
                </div>
                <RecordRightSidebar
                    filters={filters}
                    setFilters={setFilters}
                    onSearch={handleSearch}
                    loading={loading}
                    total={total}
                />
            </div>
        </SidebarProvider>
    );
}