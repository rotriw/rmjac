import { getWithIden } from "@/api/server/api_view_default";

export default async function Handle({ params }: { params: Promise<{ view_method: string; slug: string[] }> }) {
  const ls = await params;
  const data = await getWithIden({
    iden: ls.slug.join("/"),
    view_page: ls.view_method,
  });
  console.log(get_Detail);
  return (
    <>
    {}
    </>
  );
}
