import { ImageResponse } from 'next/og';

// Same mark and colors as components/brand.tsx's BrandMark, with the CSS custom properties resolved to
// literal hex (ImageResponse/Satori doesn't read the app's stylesheet or resolve var()).
const KIT = '#040609';
const STRIPE = '#4a79ff';
const TAPE = '#f7cd3a';

// Maskable icons are cropped to a circle/squircle by the OS, so the mark is scaled down to sit inside
// the ~80% safe zone instead of bleeding to the edge like the regular icon does.
export function renderAppIcon({ size, maskable = false }: { size: number; maskable?: boolean }) {
  const markScale = maskable ? 0.55 : 0.82;
  const markSize = size * markScale;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: KIT,
        }}
      >
        <svg width={markSize} height={markSize} viewBox="0 0 24 24">
          <path d="M8.5 3h5L8 21H3z" fill={STRIPE} />
          <path d="M16.5 3h5L16 21h-5z" fill={TAPE} />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
