// Stayflow mark: a doorway (stay) with a lit lantern and a flowing line. Wordmark: "stay" firm, "flow" light.
export function Mark({ size = "1.25em", onDark = false }: { size?: number | string; onDark?: boolean }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 22V10.5C3 5.8 6.9 2 12 2s9 3.8 9 8.5V22z" fill={onDark ? '#f6f4ee' : 'var(--accent)'}/>
    <circle cx="12" cy="9" r="1.8" fill="var(--brass)"/>
    <path d="M7 16.2c1.6-2 3.4-2 5 0s3.4 2 5 0" fill="none" stroke={onDark ? 'var(--pine-deep)' : '#fff'} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>;
}

export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return <span className={'wordmark'+(onDark ? ' on-dark' : '')}><Mark onDark={onDark}/><span className="wm-text">stay<span>flow</span></span></span>;
}

/** Nested doorways, drawn once as sign-in artwork. Decorative only. */
export function Doorways() {
  return <svg className="doorways" viewBox="0 0 320 380" aria-hidden="true">
    {[0, 1, 2, 3].map(i => {
      const inset = i * 30, x = 20 + inset, w = 280 - inset * 2, r = w / 2, top = 20 + inset;
      return <path key={i} className="arch" style={{ animationDelay: i * 90 + 'ms' }} fill={i === 3 ? 'rgb(246 244 238 / .06)' : 'none'}
        stroke="#f6f4ee" strokeOpacity={0.2 - i * 0.04} strokeWidth="1.5" d={`M${x} 380V${top + r}A${r} ${r} 0 0 1 ${x + w} ${top + r}V380`}/>;
    })}
    <circle className="arch lantern" style={{ animationDelay: '420ms' }} cx="160" cy="176" r="5" fill="var(--brass)"/>
  </svg>;
}

/** Up to two initials for the property monogram. Array.from keeps emoji and non-Latin letters whole. */
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => Array.from(word)[0]).join('').toUpperCase();
