import axios from "axios";

import type { PlaceResult } from "../types";

const API_URL = "https://openapi.naver.com/v1/search/local.json";

interface NaverLocalItem {
  title: string;
  category?: string;
  address?: string;
  roadAddress?: string;
  telephone?: string;
  link?: string;
}

function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

/**
 * 네이버 지역 검색 오픈 API로 업체 정보를 조회한다.
 * API 키 미설정이거나 요청 실패 시 빈 배열을 반환한다 (graceful degradation) —
 * 호출부는 이를 "가게 정보 없이 진행"으로 처리하면 된다.
 */
export async function searchPlace(businessName: string, location: string): Promise<PlaceResult[]> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return [];
  }

  const query = `${location} ${businessName}`.trim();

  try {
    const { data } = await axios.get(API_URL, {
      params: { query, display: 5, sort: "random" },
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      timeout: 5000,
    });

    const items: NaverLocalItem[] = data.items ?? [];
    return items.map((item) => ({
      name: stripTags(item.title),
      category: item.category,
      address: item.address,
      roadAddress: item.roadAddress,
      // 전화번호 등 누락 필드는 생략
      phone: item.telephone || undefined,
      link: item.link,
    }));
  } catch {
    return [];
  }
}

export function isPlaceSearchConfigured(): boolean {
  return Boolean(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET);
}
