import { useState } from 'react';
export function ConfirmAction({label,message,onConfirm}:{label:string;message:string;onConfirm:()=>Promise<unknown>}){
  const [armed,setArmed]=useState(false),[busy,setBusy]=useState(false);
  return armed?<span className="inline-flex flex-wrap gap-3 items-center text-sm"><span>{message}</span><button type="button" disabled={busy} className="underline font-bold" onClick={async()=>{setBusy(true);try{await onConfirm();setArmed(false);}finally{setBusy(false);}}}>Confirm {label.toLowerCase()}</button><button type="button" onClick={()=>setArmed(false)}>Cancel</button></span>:<button type="button" className="underline text-sm" onClick={()=>setArmed(true)}>{label}</button>;
}
