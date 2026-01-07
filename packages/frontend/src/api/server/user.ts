"use server"

import { cookies } from "next/headers"
import { API_BASE_URL } from '@/lib/constants'
import { SidebarResponse, ProfileResponse, UserInfoResponse } from "@rmjac/api-declare";

export async function getSidebar(): Promise<SidebarResponse> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/user/sidebar?path=/`, {
      headers: {
        cookie: manage.toString()
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data: { code: number, data: SidebarResponse } = await response.json()
    return data.data!
  } catch (error) {
    throw error
  }
}

export async function getUserProfile(iden: string): Promise<ProfileResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/profile/${iden}`, {
      next: { revalidate: 60 } // Cache for 60 seconds
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data: { code: number, data: ProfileResponse } = await response.json()
    return data.data!
  } catch (error) {
    throw error
  }
}

export async function getUserInfo(): Promise<UserInfoResponse> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/user/info`, {
      headers: {
        cookie: manage.toString()
      }
    });
    const data: { code: number, data: UserInfoResponse } = await response.json()
    return data.data!
  } catch (error) {
    throw error
  }
}