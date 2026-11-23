import type { ClientEnquiry } from './data/initialData';

export type EnquiryInput = Pick<ClientEnquiry, 'type' | 'clientName' | 'email' | 'phone' | 'message' | 'propertyId' | 'propertyTitle' | 'suburbOrAddress'> & { agentName?: string; serviceInterest?: string; website?: string; newsletterOptIn?:boolean };
export type EnquiryReceipt = { reference: string; preview: boolean;newsletter?:{requestId:string;token:string} };
export type SubmitEnquiry = (data: EnquiryInput) => Promise<EnquiryReceipt>;

let pendingRequest: { fingerprint: string; id: string } | null = null;
export const submitEnquiry: SubmitEnquiry = async data => {
  const fingerprint = JSON.stringify(data);
  if (!pendingRequest || pendingRequest.fingerprint !== fingerprint) pendingRequest = { fingerprint, id: `${Date.now()}-${crypto.randomUUID()}` };
  const request = pendingRequest;
  const response = await fetch('/api/enquiries', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, requestId: request.id }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.reference) throw new Error(result?.error || 'We could not confirm receipt. Please try again or email sales@exceptionalrealestate.com.au.');
  if (pendingRequest === request) pendingRequest = null;
  return result;
};
