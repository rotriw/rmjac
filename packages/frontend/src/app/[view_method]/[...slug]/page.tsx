export default async function Handle({ params }: { params: Promise<{ view_method: string; slug: string[] }> }) {
  const ls = await params;
  const fullPath = `/${ls.view_method}/${ls.slug.join("/")}`;

  return (
    <div className="p-5 bg-white w-full text-sm text-neutral-600">
      暂未实现动态视图渲染：{fullPath}
    </div>
  );
}
