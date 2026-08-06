import React from 'react';
import { renderWithLinks } from '@/lib/linkify';

// Mentions are stored inside note text as: @[Full Name](user-uuid)
export const MENTION_TOKEN_REGEX = /@\[([^\]]+)\]\(([0-9a-fA-F-]{36})\)/g;

export interface ParsedMention {
  userId: string;
  name: string;
}

export const buildMentionToken = (name: string, userId: string) => `@[${name}](${userId})`;

export function parseMentions(text: string): ParsedMention[] {
  const out: ParsedMention[] = [];
  const seen = new Set<string>();
  const re = new RegExp(MENTION_TOKEN_REGEX);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const userId = m[2];
    if (seen.has(userId)) continue;
    seen.add(userId);
    out.push({ userId, name: m[1] });
  }
  return out;
}

/** Human-readable version of a note (mention tokens collapsed to "@Name"). */
export function stripMentionTokens(text: string): string {
  return text.replace(new RegExp(MENTION_TOKEN_REGEX), (_all, name) => `@${name}`);
}

/** Render a note with highlighted mentions plus the usual URL linkification. */
export function renderNoteWithMentions(text: string | null | undefined): React.ReactNode {
  if (!text) return text ?? null;
  const parts: React.ReactNode[] = [];
  const re = new RegExp(MENTION_TOKEN_REGEX);
  let lastIndex = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(renderWithLinks(text.slice(lastIndex, m.index)));
    parts.push(
      <span
        key={`mn-${key++}`}
        className="rounded bg-primary/10 px-1 py-0.5 font-medium text-primary"
      >
        @{m[1]}
      </span>,
    );
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push(renderWithLinks(text.slice(lastIndex)));
  return parts.map((p, i) => <React.Fragment key={`np-${i}`}>{p}</React.Fragment>);
}
