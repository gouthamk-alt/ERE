import React from 'react';
import {
  X,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Check,
} from 'lucide-react';
import { PropertyListing, TeamMember } from '../data/initialData';
import { PropertyImage } from './PropertyImage';

interface PropertyDetailModalProps {
  property: PropertyListing | null;
  agents: TeamMember[];
  onClose: () => void;
  onSubmitEnquiry: (data: {
    type: 'Property Enquiry' | 'Inspection Registration';
    clientName: string;
    email: string;
    phone: string;
    propertyTitle: string;
    propertyId: string;
    message: string;
  }) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  agents,
  onClose,
  onSubmitEnquiry,
}) => {
  const [clientName, setClientName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [enquiryType, setEnquiryType] = React.useState<'Property Enquiry' | 'Inspection Registration'>('Property Enquiry');
  const [message, setMessage] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    if (property) {
      setSubmitted(false);
      setErrorMsg('');
      setMessage(`I would like more information or to arrange an inspection for ${property.title}, ${property.suburb}.`);
    }
  }, [property]);

  if (!property) return null;

  const leadAgent = agents.find((a) => a.id === property.agentId) || agents[0];
  const coAgent = property.coAgentId
    ? agents.find((a) => a.id === property.coAgentId)
    : undefined;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !email.trim() || !phone.trim()) {
      setErrorMsg('Please provide your full name, email address, and phone number.');
      return;
    }
    if (!email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    onSubmitEnquiry({
      type: enquiryType,
      clientName: clientName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      propertyTitle: `${property.title}, ${property.suburb}`,
      propertyId: property.id,
      message: message.trim(),
    });
    setSubmitted(true);
    setErrorMsg('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-property-title"
    >
      <div className="relative w-full max-w-[1100px] bg-[#000000] text-white border border-[#c6c6c6]/40 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#000000] border-b border-[#302f2f] shrink-0">
          <div className="flex items-center gap-3 text-xs text-white/70 font-montserrat">
            <span className="text-white font-medium">{property.category}</span>
            <span aria-hidden="true">·</span>
            <span>{property.status}</span>
            <span aria-hidden="true">·</span>
            <span>{property.propertyType}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">Listing #{property.id}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close property details"
            className="p-2 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-8 bg-gradient-to-b from-[#302f2f] to-[#000000]">
          {/* Hero Visual */}
          <div className="relative aspect-16/9 w-full bg-black overflow-hidden border border-[#c6c6c6]/30">
            <PropertyImage
              src={property.imageUrl}
              alt={property.address}
              fallbackLabel={property.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

            {property.badgeText && (
              <div className="absolute top-4 left-4 bg-black/85 text-white text-xs font-montserrat px-3 py-1 border border-white/20">
                {property.badgeText}
              </div>
            )}

            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-white">
              <div>
                <p className="text-sm uppercase tracking-widest text-white/80 font-montserrat mb-1">
                  {property.suburb}, {property.state} {property.postcode}
                </p>
                <h2
                  id="modal-property-title"
                  className="font-cormorant text-3xl sm:text-5xl font-light tracking-wide text-white"
                >
                  {property.title}
                </h2>
                <p className="text-sm text-white/80 mt-1 flex items-center gap-1.5 font-montserrat">
                  <MapPin className="w-4 h-4 text-white shrink-0" />
                  {property.address}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-white/70 font-montserrat">Price Guide</p>
                <p className="font-cormorant text-2xl sm:text-4xl font-normal text-white tabular-nums">
                  {property.priceDisplay}
                </p>
              </div>
            </div>
          </div>

          {/* Key Specifications Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 py-5 px-6 bg-[#000000] border border-[#c6c6c6]/30">
            <div>
              <p className="text-xs text-white/60 font-montserrat">Bedrooms</p>
              <p className="text-lg font-medium text-white tabular-nums mt-0.5 font-montserrat">
                {property.bedrooms > 0 ? `${property.bedrooms} Bed` : 'Commercial'}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60 font-montserrat">Bathrooms</p>
              <p className="text-lg font-medium text-white tabular-nums mt-0.5 font-montserrat">
                {property.bathrooms} Bath
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60 font-montserrat">Car Parking</p>
              <p className="text-lg font-medium text-white tabular-nums mt-0.5 font-montserrat">
                {property.carSpaces} Car
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60 font-montserrat">Land Area</p>
              <p className="text-lg font-medium text-white tabular-nums mt-0.5 font-montserrat">
                {property.landSizeSqm.toLocaleString()} sqm
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60 font-montserrat">Building Area</p>
              <p className="text-lg font-medium text-white tabular-nums mt-0.5 font-montserrat">
                {property.buildingAreaSqm.toLocaleString()} sqm
              </p>
            </div>
          </div>

          {/* Two Column Narrative & Agent / Enquiry */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left 7 Cols: Description & Features */}
            <div className="lg:col-span-7 bg-[#000000] border border-[#c6c6c6]/30 p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="font-cormorant text-2xl sm:text-3xl font-light text-white leading-snug">
                  {property.headline}
                </h3>
                <p className="text-white/85 text-base leading-relaxed mt-4 font-montserrat font-light">
                  {property.description}
                </p>
              </div>

              <div className="pt-6 border-t border-[#302f2f]">
                <h4 className="text-sm font-medium text-white mb-4 font-montserrat uppercase tracking-wider">
                  Property Highlights
                </h4>
                <ul className="space-y-2.5">
                  {property.features.map((feat, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-sm text-white/85 font-montserrat font-light"
                    >
                      <span className="tabular-nums text-xs text-white/60 mt-0.5">
                        0{index + 1}.
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 border-t border-[#302f2f] flex flex-wrap items-center justify-between gap-4 text-xs text-white/70 font-montserrat">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white" />
                  <span>Inspection:</span>
                  <span className="font-medium text-white">
                    {property.inspectionTime}
                  </span>
                </div>
                <div className="tabular-nums">
                  Listed: {property.listedDate}
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Listing Agents & Direct Enquiry Form */}
            <div className="lg:col-span-5 space-y-6">
              {/* Listing Agents Card */}
              <div className="bg-[#000000] border border-[#c6c6c6] p-6 space-y-4">
                <p className="text-xs text-white/60 uppercase tracking-wider font-montserrat">
                  Listing Agents
                </p>
                <div className="space-y-4">
                  {[leadAgent, coAgent].filter(Boolean).map((agent) => (
                    <div
                      key={agent!.id}
                      className="flex items-center justify-between gap-3 pt-4 first:pt-0 border-t first:border-t-0 border-[#302f2f]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 bg-[#302f2f] overflow-hidden shrink-0 border border-[#c6c6c6]/40">
                          <PropertyImage
                            src={agent!.photoUrl}
                            alt={agent!.name}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <div>
                          <p className="text-base font-medium text-white font-cormorant">
                            {agent!.name}
                          </p>
                          <p className="text-xs text-white/70 font-montserrat">
                            {agent!.role}
                          </p>
                          <a
                            href={`tel:${agent!.phone.replace(/\s+/g, '')}`}
                            className="text-xs text-white/90 tabular-nums mt-1 inline-flex items-center gap-1 hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            {agent!.phone}
                          </a>
                        </div>
                      </div>
                      <a
                        href={`mailto:${agent!.email}?subject=Enquiry: ${encodeURIComponent(property.address)}`}
                        className="text-xs font-inter text-white border border-white/40 px-3 py-1.5 rounded-full hover:bg-white hover:text-black transition-colors whitespace-nowrap inline-flex items-center gap-1.5"
                      >
                        <Mail className="w-3 h-3" />
                        Email
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Enquiry Form */}
              <div className="bg-white text-black border border-[#c6c6c6] p-6">
                <h4 className="font-roboto text-xl font-medium text-black">
                  Enquire About This Property
                </h4>
                <p className="text-xs text-neutral-600 mt-1 font-montserrat">
                  Direct message to {leadAgent.name} at Exceptional Real Estate.
                </p>

                {submitted ? (
                  <div className="mt-4 p-4 bg-[#ededed] border border-black text-black space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-black">
                      <Check className="w-4 h-4" />
                      <span>Enquiry Sent</span>
                    </div>
                    <p className="text-xs text-neutral-700 leading-relaxed font-montserrat">
                      Thank you, {clientName}. Your enquiry for{' '}
                      <span className="font-semibold">{property.title}</span> has been logged.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="text-xs font-medium text-black underline cursor-pointer"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit} className="mt-4 space-y-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEnquiryType('Property Enquiry')}
                        className={`flex-1 py-1.5 px-3 text-xs font-inter rounded-full border transition-colors whitespace-nowrap cursor-pointer ${
                          enquiryType === 'Property Enquiry'
                            ? 'bg-black text-white border-black'
                            : 'bg-[#ededed] text-black border-[#c6c6c6]'
                        }`}
                      >
                        Property Enquiry
                      </button>
                      <button
                        type="button"
                        onClick={() => setEnquiryType('Inspection Registration')}
                        className={`flex-1 py-1.5 px-3 text-xs font-inter rounded-full border transition-colors whitespace-nowrap cursor-pointer ${
                          enquiryType === 'Inspection Registration'
                            ? 'bg-black text-white border-black'
                            : 'bg-[#ededed] text-black border-[#c6c6c6]'
                        }`}
                      >
                        Book Inspection
                      </button>
                    </div>

                    {errorMsg && (
                      <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2">
                        {errorMsg}
                      </p>
                    )}

                    <div>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Full Name"
                        className="zenu-input w-full"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="0400 000 000"
                        className="zenu-input w-full"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@smith.com"
                        className="zenu-input w-full"
                      />
                    </div>

                    <div>
                      <textarea
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Message or preferred inspection time"
                        className="w-full p-3 font-poppins text-sm text-[#363636] bg-[#ededed] border border-[#f7f9fa] rounded-[2px] focus:outline-1 focus:outline-black focus:bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="zenu-button w-full"
                    >
                      Submit Enquiry
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
