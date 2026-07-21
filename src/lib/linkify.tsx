import React from 'react';

const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<]+)/gi;
const TRAILING_PUNCT = /[.,;:!?)\]}'"]+$/;

export function renderWithLinks(text: string | null | undefined): React.ReactNode {
  if (!text) return text ?? null;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(URL_REGEX);
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    const raw = match[0];
    const start = match.index;
    let url = raw;
    let trailing = '';
    const trailMatch = url.match(TRAILING_PUNCT);
    if (trailMatch) {
      trailing = trailMatch[0];
      url = url.slice(0, url.length - trailing.length);
    }
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }
    const href = url.startsWith('http') ? url : `https://${url}`;
    parts.push(
      <a
        key={`lnk-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );
    if (trailing) parts.push(trailing);
    lastIndex = start + raw.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}
