import { useState } from 'react';
import { ArrowLeft, Mail, Phone } from 'lucide-react';
import { PropertyListing, TeamMember } from '../data/initialData';
import { PropertyCard } from './PropertyCard';
import { PropertyImage } from './PropertyImage';
import { buildAgentEmail } from '../agentEmail';

interface TeamMemberProfileProps {
  member: TeamMember;
  listings: PropertyListing[];
  onBack: () => void;
  onSelectProperty: (property: PropertyListing) => void;
}

export function TeamMemberProfile({ member, listings, onBack, onSelectProperty }: TeamMemberProfileProps) {
  const [listingView, setListingView] = useState<'current' | 'past'>('current');
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [emailPrepared, setEmailPrepared] = useState(false);
  const [formError, setFormError] = useState('');
  const assigned = listings.filter((property) => property.agentId === member.id || property.coAgentId === member.id);
  const isPast = (property: PropertyListing) => ['Sold', 'Leased'].includes(property.status) || ['Sold', 'Leased'].includes(property.category);
  const current = assigned.filter((property) => !isPast(property));
  const past = assigned.filter(isPast);
  const visibleListings = listingView === 'current' ? current : past;

  function prepareEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setFormError('Please enter your name, email address and message.');
      return;
    }
    window.location.href = buildAgentEmail(member, form);
    setEmailPrepared(true);
    setFormError('');
  }

  return (
    <div className="agent-profile max-w-[1200px] mx-auto px-6 py-12 sm:py-16 space-y-20 sm:space-y-28">
      <section aria-labelledby="agent-profile-name">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white mb-10 cursor-pointer">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to our team
        </button>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="md:col-span-5 bg-black overflow-hidden">
            <PropertyImage src={member.photoUrl} alt={member.name} className="w-full aspect-4/5 object-cover object-top" />
          </div>
          <div className="md:col-span-7 space-y-7 md:py-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/60 mb-3">Exceptional Real Estate · Our team</p>
              <h1 id="agent-profile-name" className="font-cormorant text-5xl sm:text-6xl leading-tight">{member.name}</h1>
              <p className="text-base text-white/80 mt-3">{member.role}</p>
              {member.qualification && <p className="text-sm text-white/60 mt-2">{member.qualification}</p>}
            </div>
            <p className="text-base leading-relaxed text-white/80 font-light">{member.bio}</p>
            <dl className="space-y-5">
              {member.specialties.length > 0 && <div>
                <dt className="text-xs uppercase tracking-widest text-white/50 mb-2">Specialties</dt>
                <dd className="text-sm leading-relaxed text-white/80">{member.specialties.join(' · ')}</dd>
              </div>}
              {member.languages.length > 0 && <div>
                <dt className="text-xs uppercase tracking-widest text-white/50 mb-2">Languages</dt>
                <dd className="text-sm leading-relaxed text-white/80">{member.languages.join(' · ')}</dd>
              </div>}
            </dl>
            <div className="flex flex-col items-start gap-4 text-sm">
              <a href={`tel:${member.phone.replace(/\s+/g, '')}`} className="inline-flex items-center gap-3 hover:underline"><Phone className="w-4 h-4 shrink-0" aria-hidden="true" />{member.phone}</a>
              <a href={`mailto:${member.email}`} className="inline-flex items-center gap-3 hover:underline break-all"><Mail className="w-4 h-4 shrink-0" aria-hidden="true" />{member.email}</a>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="agent-listings-heading" className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/60 mb-3">Lead & co-agent properties</p>
            <h2 id="agent-listings-heading" className="font-cormorant text-4xl sm:text-5xl">{member.name.split(' ')[0]}’s listings</h2>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Listing status">
            <button type="button" aria-pressed={listingView === 'current'} onClick={() => setListingView('current')} className={`agent-listing-filter ${listingView === 'current' ? 'is-selected' : ''}`}>Current ({current.length})</button>
            <button type="button" aria-pressed={listingView === 'past'} onClick={() => setListingView('past')} className={`agent-listing-filter ${listingView === 'past' ? 'is-selected' : ''}`}>Sold & leased ({past.length})</button>
          </div>
        </div>
        {visibleListings.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleListings.map((property) => <PropertyCard key={property.id} property={property} agentName={member.name} onSelect={onSelectProperty} />)}
        </div> : <p role="status" className="text-white/65 py-8 leading-relaxed">{listingView === 'current' ? `No current listings are assigned to ${member.name}. Contact them below to discuss your property needs.` : `No sold or leased properties are currently listed for ${member.name}.`}</p>}
      </section>

      <section aria-labelledby="agent-contact-heading" className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-16 pb-8">
        <div className="md:col-span-5 space-y-5">
          <p className="text-xs uppercase tracking-widest text-white/60">Let’s talk</p>
          <h2 id="agent-contact-heading" className="font-cormorant text-4xl sm:text-5xl">Contact {member.name.split(' ')[0]}</h2>
          <p className="text-white/70 text-sm leading-relaxed">Ask about a property, selling, leasing or your next move. Your email will be addressed to {member.name}.</p>
          <p id="agent-email-help" className="text-white/60 text-sm leading-relaxed">This form opens a draft in your email app. Review it and press Send there to deliver your enquiry.</p>
        </div>
        <form onSubmit={prepareEmail} aria-labelledby="agent-contact-heading" aria-describedby="agent-email-help" className="md:col-span-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <label className="agent-contact-label">Your name<input autoComplete="name" name="name" required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="agent-contact-input" /></label>
            <label className="agent-contact-label">Email address<input type="email" autoComplete="email" name="email" required maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="agent-contact-input" /></label>
          </div>
          <label className="agent-contact-label">Phone <span className="text-white/45">(optional)</span><input type="tel" autoComplete="tel" name="phone" maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="agent-contact-input" /></label>
          <label className="agent-contact-label">How can we help?<textarea name="message" rows={5} required maxLength={3000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="agent-contact-input" /></label>
          {formError && <p role="alert" className="text-sm text-white">{formError}</p>}
          <button type="submit" className="zenu-button-outline-light inline-flex gap-2"><Mail className="w-4 h-4" aria-hidden="true" /> Prepare email to {member.name.split(' ')[0]}</button>
          {emailPrepared && <p role="status" className="text-sm leading-relaxed text-white/70">Your email draft is ready to open. Send it from your email app to complete your enquiry. If it didn’t open, email <a className="underline break-all" href={`mailto:${member.email}`}>{member.email}</a> directly.</p>}
        </form>
      </section>
    </div>
  );
}
