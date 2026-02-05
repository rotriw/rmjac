"use server";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { StandardCard, TitleCard } from "@/components/card/card";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getUserInfo } from "@/api/server/api_user_info";
import { getNormal } from "@/api/server/api_training_list";
import { getViewDirect } from "@/api/server/api_training_view";
import Link from "next/link";
import { TrainingCard } from "@/api-components/training/training-card";

export async function NoLogin() {
  return (
    <>
      <TitleCard title="Hello!" description="Rmjac" />
    
    </>
  );
}

export async function Login({uid}: {
  uid: {
    node_id: number,
    iden: string
  }
}) {
  const user_training = await getNormal({
    method: "pin"
  });
  const user_training_list = [];
  for (const edge of user_training.data) {
    console.log(edge);
    const trainingView = await getViewDirect({ t_node_id: edge.v });
    if (trainingView.data) {
      user_training_list.push(trainingView.data);
    }
  }

  const pin_training_cards = user_training_list.map((training) => (
    <Link key={training.training_node.node_id} href={`/training/${uid.iden}/${training.training_node.public.iden}`}>
      <TrainingCard training={training.training_node.public} />
    </Link>
  ));
  return (
    <>
      <TitleCard title="Hello!" description={`${uid.iden}`} />
          <StandardCard title="Pin">
            {pin_training_cards}
            {pin_training_cards.length === 0 && (
              <div className="text-sm text-muted-foreground">暂无置顶训练, 在训练页面选择 Pin 此训练后，会显示在这里。</div>
            )}
          </StandardCard>
    </>
  )
}

export default async function Home() {
  const us = await getUserInfo();
  console.log(us);
  let context;
  if (us.is_login) {
    context = (
      <Login uid={us.user} />
    );
  } else {
    context = (
      <NoLogin />
    )
  }
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset >
        <div className="container mx-auto py-6 px-4 md:px-6">
          {context}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
