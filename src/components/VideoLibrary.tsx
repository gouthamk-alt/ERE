import { useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { YOUTUBE_CHANNEL, YOUTUBE_VIDEOS } from '../data/youtubeVideos';

export function VideoLibrary() {
  const [selected, setSelected] = useState<(typeof YOUTUBE_VIDEOS)[number]>(YOUTUBE_VIDEOS[0]);
  const [filter, setFilter] = useState('All');
  const player = useRef<HTMLDivElement>(null);
  const visible = YOUTUBE_VIDEOS.filter(video => filter === 'All' || video.kind === filter);
  return (
    <section className="video-library max-w-[1200px] mx-auto px-6 py-14 sm:py-20 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4 max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Exceptional Real Estate · YouTube</p>
          <h1 className="text-4xl sm:text-5xl">Step inside.</h1>
          <p className="text-base text-white/75 leading-relaxed">Explore our property tours and short videos from across Perth.</p>
        </div>
        <a href={YOUTUBE_CHANNEL} target="_blank" rel="noreferrer" className="zenu-button-outline-light shrink-0">Visit our YouTube channel</a>
      </div>
      <div ref={player} className="scroll-mt-24 space-y-4">
        <div className={`video-player bg-black overflow-hidden ${selected.kind === 'Short' ? 'video-player-short' : ''}`}>
          <iframe key={selected.id} src={`https://www.youtube-nocookie.com/embed/${selected.id}?rel=0`} title={selected.title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
        </div>
        <div className="flex flex-wrap justify-between gap-4">
          <h2 className="text-xl sm:text-2xl">{selected.title}</h2>
          <a href={`https://www.youtube.com/watch?v=${selected.id}`} target="_blank" rel="noreferrer" className="text-sm underline text-white/75">Watch on YouTube</a>
        </div>
      </div>
      <div className="space-y-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl">Video library</h2>
          <div className="flex gap-2" aria-label="Video type">
            {[['All', 'All videos'], ['Video', 'Property tours'], ['Short', 'Shorts']].map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className="agent-listing-filter">{label}</button>)}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-9">
          {visible.map(video => <button key={video.id} type="button" aria-label={`Watch ${video.title}`} aria-pressed={selected.id === video.id} className="video-tile text-left cursor-pointer group" onClick={() => {
            setSelected(video);
            player.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
          }}>
            <div className="relative aspect-video overflow-hidden bg-neutral-900">
              <img loading="lazy" src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 grid place-items-center bg-black/15"><span className="w-11 h-11 rounded-full bg-black/75 grid place-items-center"><Play className="w-5 h-5" aria-hidden="true" /></span></span>
              <span className="absolute bottom-3 left-3 bg-black/85 text-white px-2 py-1 text-xs">{video.kind === 'Short' ? 'Short' : 'Property tour'}</span>
            </div>
            <h3 className="text-base mt-4 leading-snug">{video.title}</h3>
            {selected.id === video.id && <p className="text-xs text-white/60 mt-2">Selected above</p>}
          </button>)}
        </div>
      </div>
    </section>
  );
}
