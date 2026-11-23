export function NewsletterOptIn({checked,onChange}:{checked:boolean;onChange:(checked:boolean)=>void}){
  return <label className="flex items-start gap-3 text-xs leading-relaxed py-3 cursor-pointer"><input type="checkbox" checked={checked} onChange={event=>onChange(event.target.checked)} className="mt-0.5 shrink-0"/><span>Send me the latest newsletter and future property news from Exceptional Real Estate.<span className="block opacity-65">Confirm your subscription after submitting. You can unsubscribe at any time.</span></span></label>;
}
