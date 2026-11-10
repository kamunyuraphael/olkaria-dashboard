export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#0E7C86" />
      <path d="M5 21 Q16 3 27 21" fill="none" stroke="#FFFFFF" strokeWidth="3.1" strokeLinecap="round" />
      <circle cx="16" cy="11" r="3.2" fill="#0E7C86" stroke="#FFFFFF" strokeWidth="1.8" />
    </svg>
  );
}
