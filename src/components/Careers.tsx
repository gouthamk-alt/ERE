import { useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import { EnquirySpamField } from './EnquirySpamField';
import { EnquiryConfirmation } from './EnquiryConfirmation';
import type { SubmitEnquiry, EnquiryReceipt } from '../enquiries';

export function Careers({onSubmitEnquiry}:{onSubmitEnquiry:SubmitEnquiry}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', experience: '', message: '' });
  const [prepared, setPrepared] = useState(false);
  const [error, setError] = useState('');
  const [busy,setBusy]=useState(false),[cv,setCv]=useState<File|null>(null),[receipt,setReceipt]=useState<EnquiryReceipt|null>(null);
  const locked=useRef(false),fileInput=useRef<HTMLInputElement>(null);
  async function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(locked.current)return;
    const website=String(new FormData(event.currentTarget).get('website')||'');
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.experience || !form.message.trim()) {
      setError('Please complete your contact details, experience and introduction.');
      return;
    }
    if(!cv){setError('Please upload your resume.');return;}
    if(!cv.size||cv.size>2*1024*1024){setError('Please choose a resume file under 2 MB.');return;}
    locked.current=true;setBusy(true);setError('');
    try{
      const base64=await new Promise<string>((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(String(reader.result).split(',')[1]);
        reader.onerror=()=>reject(new Error('Could not read the resume. Please choose it again.'));
        reader.readAsDataURL(cv);
      });
      const attachment={name:cv.name,base64};
      const saved=await onSubmitEnquiry({type:'Career Application',clientName:form.name.trim(),email:form.email.trim(),phone:form.phone.trim(),message:form.message.trim(),role:'Sales Executive',experience:form.experience,cv:attachment,website,newsletterOptIn:false});
      setReceipt(saved);setPrepared(true);
    }catch(error){setError(error instanceof Error?error.message:'Could not submit your application. Please try again.');}
    finally{locked.current=false;setBusy(false);}
  }
  return (
    <section className="careers-page max-w-[1100px] mx-auto px-6 py-14 sm:py-20 space-y-14">
      <div className="max-w-3xl space-y-5">
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">Careers at Exceptional Real Estate</p>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl" style={{ textWrap: 'balance' }}>Build your next chapter with us.</h1>
        <p className="text-base sm:text-lg text-white/75 leading-relaxed">Join our boutique real estate team in Applecross and help people make their next move across Perth.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-white/60">Open opportunity</p>
            <h2 className="text-3xl sm:text-4xl">Sales Executive</h2>
            <p className="text-sm text-white/70">Applecross, Western Australia</p>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl">What you’ll bring</h3>
            <ul className="list-disc pl-5 space-y-3 text-sm sm:text-base text-white/75 leading-relaxed">
              <li>1–2 years of real estate sales experience. Applicants with more experience are also welcome.</li>
              <li>Clear communication and a professional, client-focused approach.</li>
              <li>The confidence to build relationships and follow through on enquiries.</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl">Your role</h3>
            <p className="text-sm sm:text-base text-white/75 leading-relaxed">Support buyers and sellers, build your local network, and work with our team on property campaigns and inspections.</p>
          </div>
        </div>
        <form onSubmit={apply} className="space-y-6" aria-labelledby="career-application-heading" aria-describedby="career-email-help">
          <h2 id="career-application-heading" className="text-2xl sm:text-3xl">Apply for this role</h2>
          <p id="career-email-help" className="text-sm text-white/65 leading-relaxed">Send your application directly to our office. We’ll review your experience and get in touch.</p>
          <EnquirySpamField />
          <label className="agent-contact-label">Full name<input className="agent-contact-input" name="name" autoComplete="name" required maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <label className="agent-contact-label">Email address<input className="agent-contact-input" type="email" name="email" autoComplete="email" required maxLength={254} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
            <label className="agent-contact-label">Phone number<input className="agent-contact-input" type="tel" name="phone" autoComplete="tel" required maxLength={40} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
          </div>
          <label className="agent-contact-label">Real estate sales experience<select className="agent-contact-input" name="experience" required value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })}>
            <option value="">Select your experience</option><option>1–2 years</option><option>3–5 years</option><option>More than 5 years</option>
          </select></label>
          <label className="agent-contact-label">Tell us a little about yourself<textarea className="agent-contact-input" name="message" required rows={4} maxLength={2500} value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></label>
          <label className="agent-contact-label">Upload resume (required)<input ref={fileInput} className="agent-contact-input" type="file" name="cv" required disabled={busy||prepared} onChange={e=>{setCv(e.target.files?.[0]||null);setError('');}}/><span className="block mt-2 text-xs text-white/55">PDF, Word or any other file format, up to 2 MB. Your resume is sent privately with your application.</span></label>
          {error && <p role="alert" className="text-sm">{error}</p>}
          <button type="submit" disabled={busy||prepared} className="zenu-button-outline-light inline-flex gap-2 disabled:opacity-50"><Mail className="w-4 h-4" aria-hidden="true" />{busy?'Submitting…':prepared?'Application received':'Submit application'}</button>
          {prepared && <p role="status" className="text-sm text-white/75 leading-relaxed">Your application has been received. Our team will review it and get in touch. <button type="button" className="underline" onClick={()=>{setPrepared(false);setForm({name:'',email:'',phone:'',experience:'',message:''});setCv(null);if(fileInput.current)fileInput.current.value='';}}>Submit another application</button></p>}
        </form>
      </div>
      <EnquiryConfirmation receipt={receipt} onClose={()=>setReceipt(null)} application />
    </section>
  );
}
