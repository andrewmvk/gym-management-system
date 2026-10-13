import { renderAppIcon } from '@/lib/app-icon';

export function GET() {
  return renderAppIcon({ size: 192 });
}
