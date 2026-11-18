export function buildAgentEmail(
  member: { name: string; email: string },
  form: { name: string; email: string; phone: string; message: string },
) {
  const subject = `Website enquiry for ${member.name}`;
  const body = `Hello ${member.name},\n\n${form.message.trim()}\n\nFrom: ${form.name.trim()}\nEmail: ${form.email.trim()}${form.phone.trim() ? `\nPhone: ${form.phone.trim()}` : ''}`;
  return `mailto:${member.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
