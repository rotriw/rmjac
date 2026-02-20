import { getProfile } from "@/api/server/api_user_info"
import { SimplyUser } from "@rmjac/api-declare"
import { UserProfileEditClient } from "./user-profile-edit-client"

interface UserProfileData {
  user: SimplyUser
}

async function getUserProfile(id: string): Promise<UserProfileData | null> {
  try {
    const response = await getProfile({ iden: id })
    return { user: response.user }
  } catch (error) {
    console.error("Failed to fetch user profile:", error)
    return null
  }
}

export default async function UserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profileData = await getUserProfile(id)

  if (!profileData) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <p className="text-gray-400">用户信息加载失败</p>
      </div>
    )
  }

  return <UserProfileEditClient user={profileData.user} />
}
