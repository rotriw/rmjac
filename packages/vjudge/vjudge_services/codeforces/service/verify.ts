import { bool } from "@techstark/opencv-js";
import { fetchUserSubmissions } from "./submission.ts";

export interface CodeforcesUser {
  lastName?: string;
  country?: string;
  lastOnlineTimeSeconds: number;
  city?: string;
  rating: number;
  friendOfCount: number;
  titlePhoto: string;
  handle: string;
  avatar: string;
  firstName?: string;
  contribution: number;
  organization?: string;
  rank: string;
  maxRating: number;
  registrationTimeSeconds: number;
  maxRank: string;
}

interface CodeforcesResponse {
  status: string;
  result: CodeforcesUser[];
  comment?: string;
}

export const verifyApiKey = async (
  handle: string,
  apiKey: string,
  apiSecret: string
): Promise<boolean> => {
    try {
        const data = await fetchUserSubmissions(handle, apiKey, apiSecret, 1, 1);
        return true;
    } catch (error) {
        return false;
    }
};