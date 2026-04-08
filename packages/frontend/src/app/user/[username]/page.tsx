import { notFound } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TitleCard } from "@/components/card/card";
import { getProfile } from "@/api/server/api_user_profile";

function formatDate(input: string) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  let profile: Awaited<ReturnType<typeof getProfile>> | null = null;
  try {
    profile = await getProfile({ username });
  } catch {
    profile = null;
  }

  if (!profile) {
    notFound();
  }

  const user = profile.user;

  return (
    <>
      <AppSidebar path={`user/${username}`} />
      <div className="w-full bg-white p-5">
        <TitleCard title={`${user.name} 的主页`} description={`@${user.iden}`} />

        <div className="mb-4 rounded-md border bg-white p-4">
          <div className="flex items-start gap-4">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={`${user.name}的头像`}
                className="flex h-16 w-16 items-center justify-center rounded-full border bg-neutral-100 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-neutral-100 text-xl font-semibold text-neutral-700">
                {(user.name || user.iden).slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <div className="text-xl font-semibold text-neutral-900">{user.name}</div>
              <div className="text-sm text-neutral-600">@{user.iden}</div>
              <div className="mt-2 text-sm text-neutral-700">
                {user.description?.content?.trim() || "这个人很懒，还没有写简介。"}
              </div>
              <div className="mt-2 text-xs text-neutral-500">
                加入时间：{formatDate(user.creation_time)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-md border bg-white p-4">
            <div className="text-xs text-neutral-500">通过题目</div>
            <div className="mt-1 text-2xl font-semibold">{profile.accepted_count}</div>
          </div>
          <div className="rounded-md border bg-white p-4">
            <div className="text-xs text-neutral-500">提交总数</div>
            <div className="mt-1 text-2xl font-semibold">{profile.submit_count}</div>
          </div>
          <div className="rounded-md border bg-white p-4">
            <div className="text-xs text-neutral-500">TODO 题单</div>
            <div className="mt-1 text-2xl font-semibold">{profile.todo_count}</div>
          </div>
          <div className="rounded-md border bg-white p-4">
            <div className="text-xs text-neutral-500">TODO 题目</div>
            <div className="mt-1 text-2xl font-semibold">{profile.todo_problem_count}</div>
          </div>
        </div>

        {profile.accepted_problems && profile.accepted_problems.length > 0 && (
          <div className="mt-4 rounded-md border bg-white p-4">
            <div className="mb-3 text-lg font-semibold text-neutral-900">已通过的题目</div>
            <div className="flex flex-wrap gap-2">
              {profile.accepted_problems.map((probIden) => (
                <a
                  key={probIden}
                  href={`/problem/${probIden}`}
                  className="rounded-md bg-green-50 px-2 py-1 text-sm text-green-700 transition-colors hover:bg-green-100 hover:text-green-800"
                >
                  {probIden}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
