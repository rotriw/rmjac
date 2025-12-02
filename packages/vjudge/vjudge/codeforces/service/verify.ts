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
): Promise<CodeforcesUser> => {
  const params = new URLSearchParams();
  params.append("apiKey", apiKey);
  params.append("time", Math.floor(Date.now() / 1000).toString());
  params.append("handle", handle);

  const sortedParams = Array.from(params.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const paramString = sortedParams
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const rand = "123456";
  const apiSig = `${rand}/user.info?${paramString}#${apiSecret}`;

  const hashedApiSig = await crypto.subtle.digest(
    "SHA-512",
    new TextEncoder().encode(apiSig)
  );

  const hex = (buffer: ArrayBuffer) => {
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const finalApiSig = `${rand}${hex(hashedApiSig)}`;

  const url = `https://codeforces.com/api/user.info?${paramString}&apiSig=${finalApiSig}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Codeforces API request failed");
  }

  const data = (await res.json()) as CodeforcesResponse;

  if (data.status !== "OK") {
    throw new Error(`Codeforces API error: ${data.comment}`);
  }

  if (!data.result || data.result.length === 0) {
    throw new Error("User not found on Codeforces");
  }

  return data.result[0];
};