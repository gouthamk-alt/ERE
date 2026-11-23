import { useEffect, useRef, useState } from 'react';
import { Quote, Star } from 'lucide-react';
import { testimonialStart, type Testimonial } from '../testimonials';

export function TestimonialsCarousel({ items, page }: { items: Testimonial[]; page: string }) {
  const available = items.filter(item => item.visible);
  const start = testimonialStart(page, available.length);
  const visible = [...available.slice(start), ...available.slice(0, start)].slice(0, 3);
  const [step, setStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false), [inView, setInView] = useState(false), [pageVisible, setPageVisible] = useState(!document.hidden);
  const section = useRef<HTMLElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const rotating = !reducedMotion && !hovered && !focused && inView && pageVisible && visible.length > 1;
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting && entry.intersectionRatio >= 0.25), { threshold: 0.25 });
    if (section.current) observer.observe(section.current);
    const visibility = () => setPageVisible(!document.hidden);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionChange = () => setReducedMotion(preference.matches);
    document.addEventListener('visibilitychange', visibility);
    preference.addEventListener('change', motionChange);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); preference.removeEventListener('change', motionChange); };
  }, [visible.length > 0]);
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => setStep(current => (current + 1) % visible.length), 6000);
    return () => window.clearTimeout(timer);
  }, [rotating, step, visible.length]);
  if (!visible.length) return null;
  const index = step % visible.length;
  const review = visible[index];
  const move = (amount: number) => setStep(current => (current + amount + visible.length) % visible.length);
  return <section ref={section} aria-label="Client testimonials" aria-roledescription="carousel" tabIndex={0}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
    onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); } }}
    onTouchStart={event => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
    onTouchEnd={event => { const start = touch.current; touch.current = null; if (!start) return; const x = event.changedTouches[0].clientX - start.x, y = event.changedTouches[0].clientY - start.y; if (Math.abs(x) > 60 && Math.abs(x) > Math.abs(y) * 1.5) move(x < 0 ? 1 : -1); }}
    className="testimonials-section bg-black text-white px-6 lg:px-12 py-20 lg:py-28 focus-visible:outline focus-visible:outline-white/50 focus-visible:outline-offset-[-4px]">
    <div className="max-w-4xl mx-auto text-center">
      <div className="mb-10 lg:mb-12"><p className="text-sm uppercase tracking-[0.2em] text-white/55 mb-5">In their words</p><h2 className="text-3xl lg:text-4xl font-bold leading-tight">The people behind every move.</h2></div>
      <div className="min-w-0 max-w-3xl mx-auto">
        <div aria-live={rotating ? 'off' : 'polite'} aria-atomic="true">
          <figure key={review.id} className="testimonial-slide" role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${visible.length}`}>
            <Quote size={30} strokeWidth={1} className="text-white/35 mb-6 mx-auto" aria-hidden="true" />
            {review.rating !== null && <div className="flex justify-center gap-1 text-white mb-5" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: review.rating }, (_, number) => <Star key={number} size={15} fill="currentColor" aria-hidden="true" />)}</div>}
              <blockquote className="text-base md:text-lg leading-relaxed font-normal whitespace-pre-line break-words">“{review.quote}”</blockquote>
            <figcaption className="mt-8"><p className="font-bold text-base">{review.clientName}</p>{review.context && <p className="text-sm text-white/55 mt-2">{review.context}</p>}</figcaption>
          </figure>
        </div>
        {visible.length > 1 && <div className="flex items-center justify-center mt-7" role="group" aria-label="Choose a testimonial">
          {visible.map((item, position) => <button key={item.id} type="button" aria-label={`Show testimonial ${position + 1} of ${visible.length}`} aria-current={position === index ? 'true' : undefined} onClick={() => setStep(position)} className="testimonial-dot"><span className={position === index ? 'is-active' : ''} /></button>)}
        </div>}
      </div>
    </div>
  </section>;
}
