import { useEffect, useRef, useId, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { EnquiryReceipt } from '../enquiries';

export function EnquiryConfirmation({ receipt, onClose, application=false }: { receipt: EnquiryReceipt | null; onClose: () => void; application?:boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [newsletterReceipt, setNewsletterReceipt] = useState<EnquiryReceipt | null>(null);
  const [subscription,setSubscription]=useState(''),[busy,setBusy]=useState(false),[subscriptionError,setSubscriptionError]=useState('');
  useEffect(() => {
    if (!receipt) { dialog.current?.close(); return; }
    setSubscription('');setSubscriptionError('');setNewsletterReceipt(receipt.newsletter ? receipt : null);
    dialog.current?.showModal();
    const timeout = window.setTimeout(() => closeRef.current(), 4000);
    return () => window.clearTimeout(timeout);
  }, [receipt]);
  return <><dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => event.stopPropagation()}
    className="enquiry-confirmation bg-black text-white border border-white/20 p-7 sm:p-10 max-w-sm w-[calc(100%-2rem)] m-auto text-center">
    <button type="button" onClick={onClose} aria-label="Close confirmation" className="absolute top-3 right-3 p-2"><X size={20} /></button>
    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/40"><Check size={30} aria-hidden="true" /></div>
    <h2 id={titleId} className="text-2xl font-bold mb-3">{application?'Application received':'Enquiry received'}</h2>
    <p id={descriptionId} className="text-white/75 text-sm leading-relaxed">Thank you. Our team will be in touch.</p>
  </dialog>
    {newsletterReceipt?.newsletter&&<aside aria-label="Newsletter subscription" className="fixed bottom-4 right-4 z-[100] bg-black text-white border border-white/20 p-6 pr-10 max-w-sm w-[calc(100%-2rem)] space-y-3 shadow-xl">
      <button type="button" onClick={()=>setNewsletterReceipt(null)} aria-label="Close newsletter invitation" className="absolute top-2 right-2 p-2"><X size={18}/></button>
      <p className="text-sm text-white/80">Also receive our latest newsletter and future property updates? You can unsubscribe from every email.</p>
      {!subscription&&<button type="button" disabled={busy} className="zenu-button-outline-light" onClick={async()=>{
        setBusy(true);setSubscriptionError('');try{const response=await fetch('/api/enquiries/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(newsletterReceipt.newsletter)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Please try again.');setSubscription(result.subscribed?'Your newsletter request is confirmed.':'Your existing unsubscribe preference is unchanged. Contact our team if you would like to rejoin.');}catch(error){setSubscriptionError(error instanceof Error?error.message:'Please try again.');}finally{setBusy(false);}
      }}>{busy?'Confirming…':'Confirm newsletter subscription'}</button>}
      {subscription&&<p role="status" className="text-sm">{subscription}</p>}{subscriptionError&&<p role="alert" className="text-sm">{subscriptionError}</p>}
    </aside>}
  </>;
}
