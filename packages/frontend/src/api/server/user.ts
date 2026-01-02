"use server"

import { cookies } from "next/headers"
import { API_BASE_URL } from './config'

export async function getSidebar(): Promise<any> {
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
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function getUserProfile(iden: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/profile/${iden}`, {
      next: { revalidate: 60 } // Cache for 60 seconds
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function getUserInfo(): Promise<any> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/user/info`, {
      headers: {
        cookie: manage.toString()
      }
    });
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}