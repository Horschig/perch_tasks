import type { TodoItem } from './types';

export interface TextSegment {
  text: string;
  highlight: boolean;
}

export function filterTree(items: TodoItem[], query: string): TodoItem[] {
  if (!query.trim()) return items;

  const lowerQuery = query.toLowerCase();

  return items.reduce<TodoItem[]>((acc, item) => {
    const filteredChildren = filterTree(item.children, query);
    const selfMatches = item.text.toLowerCase().includes(lowerQuery);

    if (selfMatches || filteredChildren.length > 0) {
      acc.push({ ...item, children: filteredChildren });
    }

    return acc;
  }, []);
}

export function highlightText(text: string, query: string): TextSegment[] {
  if (!query) return [{ text, highlight: false }];

  const segments: TextSegment[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let lastIndex = 0;

  let pos = lowerText.indexOf(lowerQuery, lastIndex);
  while (pos !== -1) {
    if (pos > lastIndex) {
      segments.push({ text: text.slice(lastIndex, pos), highlight: false });
    }
    segments.push({ text: text.slice(pos, pos + query.length), highlight: true });
    lastIndex = pos + query.length;
    pos = lowerText.indexOf(lowerQuery, lastIndex);
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), highlight: false });
  }

  return segments;
}
