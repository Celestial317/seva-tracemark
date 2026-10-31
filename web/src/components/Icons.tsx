type P = { className?: string; size?: number }
const svg = (size: number, className?: string) => ({
  width: size, height: size, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, className,
})

export const Arrow = ({ className, size = 16 }: P) => (
  <svg {...svg(size, className)}><path d="M3 8h10M9 4l4 4-4 4" /></svg>
)
export const Check = ({ className, size = 14 }: P) => (
  <svg {...svg(size, className)} strokeWidth={2}><path d="M3 8.5l3.2 3L13 4.5" /></svg>
)
export const Lock = ({ className, size = 14 }: P) => (
  <svg {...svg(size, className)}><rect x="3" y="7" width="10" height="7" /><path d="M5 7V5a3 3 0 016 0v2" /></svg>
)
export const Unlocked = ({ className, size = 16 }: P) => (
  <svg {...svg(size, className)}><rect x="3" y="7" width="10" height="7" /><path d="M5 7V5a3 3 0 015.6-1.5" /></svg>
)
export const Warning = ({ className, size = 16 }: P) => (
  <svg {...svg(size, className)}><path d="M8 2l6.5 11.5h-13zM8 6.5v3.5M8 11.8v.2" /></svg>
)
export const Camera = ({ className, size = 16 }: P) => (
  <svg {...svg(size, className)}><path d="M2 5h2.5l1-1.5h5L11.5 5H14v8H2z" /><circle cx="8" cy="8.7" r="2.3" /></svg>
)
export const Doc = ({ className, size = 16 }: P) => (
  <svg {...svg(size, className)}><path d="M4 2h5l3 3v9H4zM9 2v3h3M6 8h4M6 11h4" /></svg>
)
export const Rows = ({ className, size = 16 }: P) => (
  <svg {...svg(size, className)}><path d="M3 4h10M3 8h10M3 12h10" /></svg>
)
export const Diff = ({ className, size = 16 }: P) => (
  <svg {...svg(size, className)}><path d="M6 4L2 8l4 4M10 4l4 4-4 4" /></svg>
)
export const Search = ({ className, size = 16 }: P) => (
  <svg {...svg(size, className)}><circle cx="7" cy="7" r="4" /><path d="M10 10l4 4" /></svg>
)
export const Refresh = ({ className, size = 16 }: P) => (
  <svg {...svg(size, className)}><path d="M13 8a5 5 0 11-1.5-3.5M13 2v3h-3" /></svg>
)
