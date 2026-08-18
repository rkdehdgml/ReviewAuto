import * as cheerio from "cheerio";
import Parser from "rss-parser";

const parser = new Parser();

export interface BlogPost {
  title: string;
  content: string; // HTML 태그 제거된 순수 텍스트
  link: string;
  pubDate?: string;
}

function extractBlogId(blogUrl: string): string {
  // https://blog.naver.com/{id} 또는 https://m.blog.naver.com/{id}
  const match = blogUrl.match(/blog\.naver\.com\/([^/?#]+)/);
  if (!match) {
    throw new Error(`네이버 블로그 주소 형식이 아닙니다: ${blogUrl}`);
  }
  return match[1];
}

function stripHtml(html: string): string {
  const $ = cheerio.load(html);
  return $.text().replace(/\s+/g, " ").trim();
}

/**
 * 네이버 블로그 RSS에서 최근 글을 순차적으로 수집한다.
 * rate limit 회피를 위해 병렬이 아닌 순차 처리, 요청 사이 짧은 딜레이를 둔다.
 */
export async function fetchRecentPosts(blogUrl: string, limit = 10): Promise<BlogPost[]> {
  const blogId = extractBlogId(blogUrl);
  const rssUrl = `https://rss.blog.naver.com/${blogId}.xml`;

  const feed = await parser.parseURL(rssUrl);
  const items = (feed.items ?? []).slice(0, limit);

  const posts: BlogPost[] = [];
  for (const item of items) {
    const rawContent = item.content ?? item.contentSnippet ?? "";
    posts.push({
      title: item.title ?? "(제목 없음)",
      content: stripHtml(rawContent),
      link: item.link ?? "",
      pubDate: item.pubDate,
    });
    // 순차 처리 + 소폭 딜레이로 rate limit 회피
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  if (posts.length === 0) {
    throw new Error("RSS에서 글을 가져오지 못했습니다. 블로그 주소를 확인해주세요.");
  }

  return posts;
}
