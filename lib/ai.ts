// Shared Anthropic client + helpers.
//
// AI features degrade gracefully: when ANTHROPIC_API_KEY is absent, route
// handlers return 503 with { disabled: true } and the UI hides the corresponding
// controls.

import Anthropic from '@anthropic-ai/sdk';

export const HAIKU = 'claude-haiku-4-5-20251001';
export const SONNET = 'claude-sonnet-4-6';

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

let _client: Anthropic | null = null;
export function client(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// Extract the first tool_use block from a message response.
export function firstToolInput<T = any>(resp: Anthropic.Messages.Message): T | null {
  for (const block of resp.content) {
    if (block.type === 'tool_use') return block.input as T;
  }
  return null;
}

// Extract concatenated text content.
export function joinText(resp: Anthropic.Messages.Message): string {
  return resp.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}

// Detect image media type from a data URL or raw base64 header bytes.
export function detectMediaType(data: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  // data may be a data URL ("data:image/png;base64,...") or just base64
  const m = /^data:(image\/[a-z+]+);base64,/i.exec(data);
  if (m) {
    const t = m[1].toLowerCase();
    if (t === 'image/jpg' || t === 'image/jpeg') return 'image/jpeg';
    if (t === 'image/png') return 'image/png';
    if (t === 'image/webp') return 'image/webp';
    if (t === 'image/gif') return 'image/gif';
  }
  return 'image/jpeg';
}

// Strip the data URL prefix to get pure base64.
export function stripDataUrl(data: string): string {
  return data.replace(/^data:image\/[a-z+]+;base64,/i, '');
}
