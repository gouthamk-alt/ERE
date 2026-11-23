export type Testimonial = {
  id: string;
  clientName: string;
  quote: string;
  context: string;
  rating: number | null;
  visible: boolean;
};

const pageStarts = ['home', 'listings', 'list-with-us', 'team', 'team-profile', 'careers', 'videos', 'blog'];
export function testimonialStart(page: string, count: number) {
  const [section, detail = ''] = page.split(':');
  const offset = Math.max(0, pageStarts.indexOf(section));
  const extra = [...detail].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return count ? (offset + extra) % count : 0;
}
