import { useEffect } from 'react';

export function usePageMotion(view: string, ready: boolean) {
  useEffect(() => {
    if (!ready || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const root = document.querySelector('.page-content');
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.04 });
    const scan = () => {
      root.querySelectorAll<HTMLElement>('.property-card, .editorial-card, .team-card, .reveal-block').forEach((element) => {
        if (element.dataset.reveal === 'observed') return;
        element.dataset.reveal = 'observed';
        // Content already in view remains visible; only incoming sections reveal on scroll.
        if (element.getBoundingClientRect().top < window.innerHeight) element.classList.add('is-visible');
        element.classList.add('reveal-ready');
        observer.observe(element);
      });
    };
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
      root.querySelectorAll('.reveal-ready').forEach((element) => {
        element.classList.remove('reveal-ready', 'is-visible');
        element.removeAttribute('data-reveal');
      });
    };
  }, [view, ready]);
}
