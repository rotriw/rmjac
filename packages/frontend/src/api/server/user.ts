"use server"

import { cookies } from "next/headers"
import { API_BASE_URL } from '@/lib/constants'
import { 
  SidebarResponse, 
  ProfileResponse, 
  UserInfoResponse,
  SidebarQuery
} from "@rmjac/api-declare";

// Re-export types for convenience
export type { SimplyUser, SidebarItem } from "@rmjac/api-declare";

/**
 * 获取侧边栏
 * GET /api/user/sidebar
 */
export async function getSidebar(query?: SidebarQuery): Promise<SidebarResponse> {
  try {
    const manage = await cookies();
    const path = query?.path || '/';
    const response = await fetch(`${API_BASE_URL}/api/user/sidebar?path=${encodeURIComponent(path)}`, {
      headers: {
        cookie: manage.toString()
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error('Failed to get sidebar:', error);
    throw error;
  }
}

/**
 * 获取用户资料
 * GET /api/user/profile/{iden}
 */
export async function getUserProfile(iden: string): Promise<ProfileResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/profile/${iden}`, {
      next: { revalidate: 60 } // Cache for 60 seconds
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Failed to get user profile ${iden}:`, error);
    throw error;
  }
}

/**
 * 获取当前用户信息
 * GET /api/user/info
 */
export async function getUserInfo(): Promise<UserInfoResponse> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/user/info`, {
      headers: {
        cookie: manage.toString()
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Failed to get user info:', error);
    throw error;
  }
}

/**
 * 检查标识符是否已存在
 * GET /api/user/check_iden/{id}
 */
export async function checkIdenExist(id: string): Promise<{ exists: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/check_iden/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Failed to check iden ${id}:`, error);
    throw error;
  }
}

/**
 * 注册前获取验证码
 * GET /api/user/before_create
 */
export async function beforeCreate(darkMode: boolean, email: string): Promise<{
  challenge_code: string;
  challenge_verify: string;
  challenge_time: number;
}> {
  try {
    const queryString = new URLSearchParams({
      dark_mode: String(darkMode),
      email: email
    }).toString();
    
    const response = await fetch(`${API_BASE_URL}/api/user/before_create?${queryString}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Failed to get before create data:', error);
    throw error;
  }
}