"use client"

import { useState, useEffect, useRef, useCallback } from "react";
import { TreeTable, TreeTableNode } from "@/components/table/treetable";
import { Input } from "@/components/ui/input";
import { postQueryUserSubmission } from "@/api/client/api_record_query";
import { Icond, RECORD_STATUS_COLOR_MAP_INTER } from "@/api-components/record/status-utils";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { RecordRightSidebar } from "./rightbar";
import { mapJudgeStatusToRecordStatus, normalizeProblemIden } from "./utils";
import type { Filters } from "./utils";
import type { QueryResult } from "@rmjac/api-declare";

const PAGE_SIZE = 100;

export default function RecordSearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initializedRef = useRef(false);
  const [records, setRecords] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);
  const [filters, setFilters] = useState<Filters>(() => {
    const problemIden = searchParams.get("problemIden") ?? "";
    const userId = searchParams.get("userId") ?? "";
    const status = searchParams.get("status") ?? "all";
    return {
      userId,
      problemIden,
      codeLength: "",
      status,
    };
  });

  const fetchRecords = async (pageNum: number, isNewSearch: boolean = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const userId = filters.userId.trim();
      const problemIden = filters.problemIden.trim();
      const codeLength = filters.codeLength.trim();

      const res = await postQueryUserSubmission({
        offset: (pageNum - 1) * PAGE_SIZE,
        show_number: PAGE_SIZE,
        user_id: userId ? Number(userId) : null,
        problem_iden: problemIden || null,
        code_length: codeLength ? Number(codeLength) : null,
        status: filters.status !== "all" ? filters.status as any : null,
      });

      let nextRecords = res?.records ?? [];

      if (isNewSearch) {
        setRecords(nextRecords);
      } else {
        setRecords((prev) => {
          const newUniqueRecords = nextRecords.filter(
            (newItem) => !prev.some((existingItem) => existingItem.record.id === newItem.record.id)
          );
          return [...prev, ...newUniqueRecords];
        });
      }

      setHasMore(nextRecords.length === PAGE_SIZE);
    } catch (error) {
      console.error("Failed to fetch records:", error);
      setHasMore(false);
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

  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => {
            const nextPage = prevPage + 1;
            fetchRecords(nextPage);
            return nextPage;
          });
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  const treeData: TreeTableNode[] = records.map((item) => {
    const status = mapJudgeStatusToRecordStatus(item.record.judge_detail.status);
    const problemIden = item.problem.iden;
    const displayIden = normalizeProblemIden(problemIden);

    return {
      id: item.record.id,
      background: RECORD_STATUS_COLOR_MAP_INTER[status],
      onClick: () => router.push(`/record/${item.record.id}`),
      content_title: (
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icond size={4} status={status} />
          <span className="font-bold">{status}</span>
          <span className="opacity-70">#{item.record.id}</span>
        </div>
      ),
      content: (
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-4 text-sm">
            <span onClick={(e) => e.stopPropagation()}>
              <Link href={`/problem/${displayIden}`} className="hover:underline font-semibold">
                {item.problem.data.name} ({displayIden})
              </Link>
            </span>
            <span>{item.record.language}</span>
            <span onClick={(e) => e.stopPropagation()}>
              <Link href={`/user/${item.user.iden}`} className="hover:underline opacity-60">
                {item.user.name}
              </Link>
            </span>
            <span className="opacity-60">{new Date(String(item.record.judge_time)).toLocaleString()}</span>
          </div>
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-1 flex-col lg:flex-row w-full">
      <div className="flex-1 p-2 min-w-0">
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
          <div className="text-center py-20 border rounded-md bg-muted/10 opacity-50">未找到相关记录</div>
        )}
      </div>

      <RecordRightSidebar
        filters={filters}
        setFilters={setFilters}
        onSearch={handleSearch}
        loading={loading}
        loadedCount={records.length}
      />
    </div>
  );
}
