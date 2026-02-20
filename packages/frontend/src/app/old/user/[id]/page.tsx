import { getProfile } from "@/api/server/api_user_info"
import { SimplyUser } from "@rmjac/api-declare"
import { UserProfileClient } from "./user-profile-client"

interface UserProfileData {
    user: SimplyUser
    pass: string[]
}

async function getUserProfile(id: string): Promise<UserProfileData | null> {
    try {
        const response = await getProfile({ iden: id })
        return {
            user: response.user,
            pass: response.pass ?? [],
        }
    } catch (error) {
        console.error("Failed to fetch user profile:", error)
        return null
    }
}

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const profileData = await getUserProfile(id)

    return (
        <UserProfileClient
            user={profileData?.user ?? null}
            pass={profileData?.pass ?? []}
        />
    )
}
