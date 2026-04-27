import * as cheerio from 'cheerio';
import type { OllamaChapter } from './types';

export interface OllamaClient {
  baseUrl: string;
  model: string;
}

export async function initOllama(baseUrl: string, model: string): Promise<OllamaClient | null> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    console.log(`[Ollama] Conectado em ${baseUrl} (modelo: ${model})`);
    return { baseUrl, model };
  } catch {
    return null;
  }
}

async function searchGameUrls(gameName: string): Promise<string[]> {
  const query = encodeURIComponent(`${gameName} walkthrough chapters guide`);
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const urls: string[] = [];
    $('a.result__a').each((_i, el) => {
      const href = $(el).attr('href') ?? '';
      const match = href.match(/[?&]uddg=([^&]+)/);
      if (match) {
        try {
          const decoded = decodeURIComponent(match[1]);
          if (decoded.startsWith('http')) urls.push(decoded);
        } catch { /* skip */ }
      }
    });
    return urls.slice(0, 3);
  } catch {
    return [];
  }
}

async function extractPageHeadings(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return '';
    const html = await res.text();
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, aside, noscript').remove();
    const lines: string[] = [];
    $('h1, h2, h3').each((_i, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text) lines.push(text);
    });
    $('ol li, ul li').each((_i, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (text && text.length < 120) lines.push(text);
    });
    return lines.slice(0, 200).join('\n');
  } catch {
    return '';
  }
}

export async function extractChapters(
  client: OllamaClient,
  gameName: string,
): Promise<OllamaChapter[]> {
  const urls = await searchGameUrls(gameName);
  let context = '';
  for (const url of urls) {
    const text = await extractPageHeadings(url);
    if (text) context += `\n--- Source: ${url} ---\n${text}`;
    if (context.length > 6000) break;
  }

  const systemPrompt = [
    'You are a strict JSON extractor for video game chapters.',
    `Extract the ordered chapter/level list for the game "${gameName}".`,
    'Return ONLY valid JSON: {"chapters":[{"name":"Chapter name","order":1},...]}',
    'Only include real game chapters/stages/levels. No tips, FAQs, or meta content.',
    'If nothing relevant is found, return {"chapters":[]}.',
    'No markdown, no explanations. Just the JSON object.',
  ].join(' ');

  const userContent = context.trim()
    ? `Web context:\n${context.slice(0, 5500)}\n\nExtract chapters for "${gameName}".`
    : `List the main chapters/stages of "${gameName}" in order.`;

  try {
    const res = await fetch(`${client.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: client.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        format: 'json',
        stream: false,
        options: { temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) return [];
    const data = await res.json() as { message?: { content?: string } };
    const raw = data?.message?.content ?? '';
    const parsed = JSON.parse(raw) as { chapters?: unknown[] };
    if (!Array.isArray(parsed?.chapters)) return [];

    return (parsed.chapters as OllamaChapter[])
      .filter(c => typeof c.name === 'string' && c.name.trim() && typeof c.order === 'number')
      .map(c => ({ name: c.name.trim(), order: c.order }))
      .sort((a, b) => a.order - b.order)
      .slice(0, 200);
  } catch {
    return [];
  }
}
