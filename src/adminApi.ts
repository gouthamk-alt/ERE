export async function adminApi(path: string, data?: unknown) {
  const response = await fetch(path, data === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not complete this action.');
  return result;
}
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Please try again.';
export async function uploadMedia(file: File) {
  if (file.size > 3 * 1024 * 1024) throw new Error('Choose a file under 3 MB.');
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file);
  });
  return (await adminApi('/api/admin/media', { name: file.name, base64, kind: /\.woff2$/i.test(file.name) ? 'font' : /\.pdf$/i.test(file.name) ? 'pdf' : 'image' })).item;
}
export const csvCell = (value: unknown) => `"${String(value ?? '').replace(/^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/, match => `'${match}`).replace(/"/g, '""')}"`;
export function downloadText(name: string, text: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}
