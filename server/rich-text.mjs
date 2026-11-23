import sanitizeHtml from './generated/sanitize-html.mjs';

export function cleanRichText(value) {
  if (typeof value !== 'string' || value.length > 100000) throw new Error('Keep formatted content below 100,000 characters.');
  return sanitizeHtml(value, {
    allowedTags: ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'span', 'blockquote', 'ul', 'ol', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'pre', 'code', 'sup', 'sub', 'div'],
    allowedAttributes: { '*': ['style'], a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'width', 'height', 'title'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'], ol: ['start'] },
    allowedSchemes: ['https', 'http', 'mailto', 'tel'], allowProtocolRelative: false,
    allowedStyles: { '*': {
      color: [/^#[a-f0-9]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i, /^[a-z]{1,20}$/i],
      'background-color': [/^#[a-f0-9]{3,8}$/i, /^rgba?\([\d\s,.%]+\)$/i, /^[a-z]{1,20}$/i],
      'font-family': [/^[a-z0-9 ,'"_-]{1,150}$/i], 'font-size': [/^(?:[1-9]\d?|100)(px|pt)$/],
      'text-align': [/^(left|right|center|justify)$/], 'line-height': [/^[12](\.\d)?$/],
      'font-weight': [/^(bold|normal|[1-9]00)$/], 'font-style': [/^(normal|italic)$/],
      'text-decoration': [/^(underline|line-through|none)$/], width: [/^(100%|[1-9]\d{0,3}px)$/],
    } },
    transformTags: { a: (_tag, attrs) => ({ tagName: 'a', attribs: { ...attrs, rel: 'noopener noreferrer', target: '_blank' } }) },
  });
}
export const plainRichText = html => sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/g, ' ').trim();
