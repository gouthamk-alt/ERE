import { displayPropertyPrice } from '../propertyPresentation';
import { ArrowUpRight, Bath, Bed, Car } from 'lucide-react';
import { PropertyListing } from '../data/initialData';
import { PropertyImage } from './PropertyImage';

export function PropertyCard({ property, agentName, onSelect }: {
  property: PropertyListing;
  agentName?: string;
  onSelect: (property: PropertyListing) => void;
}) {
  return (
    <article className="property-card">
      <button type="button" className="property-card-link" onClick={() => onSelect(property)} aria-label={`View ${property.title}, ${property.suburb}`}>
        <div className="property-card-image">
          <PropertyImage src={property.imageUrl} alt={property.title} className="w-full h-full object-cover" />
          <span className="property-card-badge">{property.badgeText || property.category}</span>
        </div>
        <div className="property-card-body">
          <p className="property-card-suburb">{property.suburb}, {property.state} {property.postcode}</p>
          <h3>{property.title}</h3>
          <p className="property-card-price">{displayPropertyPrice(property)}</p>
          <div className="property-card-specs">
            {property.bedrooms > 0 && <span><Bed aria-hidden="true" /><span>{property.bedrooms} <span className="sr-only">bedrooms</span></span></span>}
            <span><Bath aria-hidden="true" /><span>{property.bathrooms} <span className="sr-only">bathrooms</span></span></span>
            <span><Car aria-hidden="true" /><span>{property.carSpaces} <span className="sr-only">car spaces</span></span></span>
          </div>
          <div className="property-card-footer"><span>{agentName || 'View property'}</span><span className="property-card-action">View property <ArrowUpRight aria-hidden="true" /></span></div>
        </div>
      </button>
    </article>
  );
}
