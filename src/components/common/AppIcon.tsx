export type AppIconName =
  | 'user'
  | 'settings'
  | 'bell'
  | 'cart'
  | 'logout'
  | 'login'
  | 'history'
  | 'hourglass'
  | 'factory'
  | 'package'
  | 'home'
  | 'receipt'
  | 'x'
  | 'eye'
  | 'eyeOff';

export function AppIcon({ name, className = '', label }: { name: AppIconName; className?: string; label?: string }) {
  const paths: Record<AppIconName, string> = {
    user: 'M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    settings:
      'M12 3v2m0 14v2m9-9h-2M5 12H3m15.6 6.6-1.4-1.4M6.8 6.8 5.4 5.4m12.2 0-1.4 1.4M6.8 17.2l-1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    bell: 'M9 18a3 3 0 0 0 6 0M5 15h14l-1.4-1.8A5 5 0 0 1 16.5 10V9a4.5 4.5 0 0 0-9 0v1a5 5 0 0 1-1.1 3.2L5 15Z',
    cart: 'M4 5h2l2.2 10h9.6l2-7.5H7.1M10 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
    logout: 'M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3m6 5 5 4-5 4m5-4H9',
    login: 'M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3m-6-5-5-4 5-4m-5 4h10',
    history: 'M4.5 5.5v5h5M4.8 10.8a8 8 0 1 0 2.3-5.6',
    hourglass: 'M8 3h8M8 21h8M9 3v3a4 4 0 0 0 1.2 2.8L12 10.6l1.8-1.8A4 4 0 0 0 15 6V3m-6 18v-3a4 4 0 0 1 1.2-2.8L12 13.4l1.8 1.8A4 4 0 0 1 15 18v3',
    factory: 'M3 21h18M4 21V9l6 3V9l6 3V7l4 2v12',
    package: 'm3 8 9-5 9 5-9 5-9-5Zm0 0v8l9 5 9-5V8m-9 5v8',
    home: 'm3 10 9-7 9 7v10h-6v-6H9v6H3z',
    receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6m-6 4h4',
    x: 'M6 6l12 12M18 6 6 18',
    eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    eyeOff: 'm3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A11.9 11.9 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-4.2 4.9M6.1 6.1C3.5 8.1 2 12 2 12s3.5 7 10 7a11.8 11.8 0 0 0 4.1-.7',
  };

  return (
    <svg
      viewBox="0 0 24 24"
      className={`icon-svg ${className}`.trim()}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
