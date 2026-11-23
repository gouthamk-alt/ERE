export function EnquirySpamField() {
  return <div aria-hidden="true" className="absolute -left-[10000px] top-auto w-px h-px overflow-hidden">
    <label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
  </div>;
}
