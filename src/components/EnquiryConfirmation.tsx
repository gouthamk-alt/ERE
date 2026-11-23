import { useEffect, useRef, useId, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { EnquiryReceipt } from '../enquiries';

export function EnquiryConfirmation({ receipt, onClose }: { receipt: EnquiryReceipt | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [subscription,setSubscription]=useState(''),[busy,setBusy]=useState(false),[subscriptionError,setSubscriptionError]=useState('');
  useEffect(() => {
    setSubscription('');setSubscriptionError('');
    if (receipt) dialog.current?.showModal();
    else dialog.current?.close();
  }, [receipt]);
  return <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => event.stopPropagation()}
    className="enquiry-confirmation bg-black text-white border border-white/30 p-7 sm:p-10 max-w-md w-[calc(100%-2rem)] m-auto">
    <button type="button" onClick={onClose} aria-label="Close confirmation" className="absolute top-3 right-3 p-2"><X size={20} /></button>
    <Check className="mb-5" size={30} aria-hidden="true" />
    <h2 id={titleId} className="text-2xl font-bold mb-4">{receipt?.preview ? 'Preview enquiry saved' : 'Thank you — enquiry received.'}</h2>
    <p id={descriptionId} className="text-white/75 text-sm leading-relaxed">{receipt?.preview ? 'This is a local or preview test. No notification email has been sent.' : 'Your enquiry has been received. Our team will be in touch.'}</p>
    <p className="text-xs text-white/60 mt-4">Reference: {receipt?.reference}</p>
    {receipt?.newsletter&&<div className="border-t border-white/20 mt-5 pt-5 space-y-3"><p className="text-sm text-white/80">Also receive our latest newsletter and future property updates? You can unsubscribe from every email.</p>
      {!subscription&&<button type="button" disabled={busy} className="zenu-button-outline-light" onClick={async()=>{
        setBusy(true);setSubscriptionError('');try{const response=await fetch('/api/enquiries/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(receipt.newsletter)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Please try again.');setSubscription(result.subscribed?(receipt.preview?'Subscription saved in this preview. No newsletter was emailed.':'You’re subscribed. We’ll send the latest approved edition when available and include you in future newsletters.'):'Your existing unsubscribe preference is unchanged. Contact our team if you would like to rejoin.');}catch(error){setSubscriptionError(error instanceof Error?error.message:'Please try again.');}finally{setBusy(false);}
      }}>{busy?'Confirming…':'Confirm newsletter subscription'}</button>}
      {subscription&&<p role="status" className="text-sm">{subscription}</p>}{subscriptionError&&<p role="alert" className="text-sm">{subscriptionError}</p>}
    </div>}
    <button type="button" autoFocus onClick={onClose} className="zenu-button-outline-light mt-6">Done</button>
  </dialog>;
}
