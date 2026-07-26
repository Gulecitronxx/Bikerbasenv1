/* Parametric duotone motorcycle-silhouette illustrations, used as placeholder "photos".
   All shapes use currentColor-independent CSS vars so they theme automatically (light/dark). */

function wheelSVG(cx, cy, r, spokes){
  const ticks = spokes ? Array.from({length:10}, (_,i)=>{
    const a = (i/10)*Math.PI*2;
    const x1 = cx+Math.cos(a)*r*0.78, y1 = cy+Math.sin(a)*r*0.78;
    const x2 = cx+Math.cos(a)*r*0.98, y2 = cy+Math.sin(a)*r*0.98;
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="ba-tread"/>`;
  }).join('') : '';
  return `
  <circle cx="${cx}" cy="${cy}" r="${r}" class="ba-tire"/>
  ${ticks}
  <circle cx="${cx}" cy="${cy}" r="${r*0.62}" class="ba-cut"/>
  <circle cx="${cx}" cy="${cy}" r="${r*0.62}" fill="none" class="ba-rim"/>
  ${Array.from({length:6},(_,i)=>{
    const a = (i/6)*Math.PI*2;
    const x2=cx+Math.cos(a)*r*0.58, y2=cy+Math.sin(a)*r*0.58;
    return `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="ba-rim"/>`;
  }).join('')}
  <circle cx="${cx}" cy="${cy}" r="${r*0.14}" class="ba-accent"/>`;
}

const BIKE_TYPES = {
  sport:      { rr:44, rx:96,  fr:44, fx:300, gy:180 },
  naked:      { rr:44, rx:96,  fr:44, fx:300, gy:180 },
  touring:    { rr:46, rx:78,  fr:46, fx:322, gy:182 },
  cruiser:    { rr:46, rx:76,  fr:42, fx:324, gy:182 },
  adventure:  { rr:50, rx:92,  fr:50, fx:308, gy:186 },
  scooter:    { rr:32, rx:108, fr:32, fx:288, gy:170 },
  classic:    { rr:42, rx:100, fr:42, fx:296, gy:176 },
  cross:      { rr:52, rx:94,  fr:52, fx:306, gy:188 },
};

function bodyFor(type, p){
  const { rr, rx, fr, fx, gy } = p;
  const seatY = gy - rr - 10;
  switch(type){
    case 'sport': return `
      <path d="M${rx-10},${gy-10} Q${rx+10},${seatY-30} ${rx+55},${seatY-24} L${rx+95},${seatY-20} Q${rx+140},${seatY-46} ${fx-30},${gy-46} L${fx+6},${gy-16} L${fx-14},${gy+2} L${rx+70},${gy+6} Q${rx+20},${gy+2} ${rx-10},${gy-10} Z" class="ba-body"/>
      <path d="M${fx-46},${gy-46} L${fx-10},${gy-58} L${fx+10},${gy-40} L${fx-18},${gy-28} Z" class="ba-accent"/>
      <line x1="${fx-16}" y1="${gy-56}" x2="${fx-40}" y2="${gy-64}" class="ba-line"/>
      <path d="M${rx+30},${seatY-22} Q${rx+65},${seatY-30} ${rx+95},${seatY-18} L${rx+90},${seatY-4} L${rx+35},${seatY-6} Z" class="ba-accent" opacity=".85"/>
      <line x1="${rx+8}" y1="${gy-4}" x2="${rx-2}" y2="${gy+14}" class="ba-line"/>`;
    case 'naked': return `
      <path d="M${rx-8},${gy-10} Q${rx+8},${seatY-22} ${rx+50},${seatY-18} L${rx+95},${seatY-14} Q${rx+130},${seatY-30} ${fx-24},${gy-30} L${fx-4},${gy-8} L${rx+70},${gy+4} Q${rx+18},${gy+2} ${rx-8},${gy-10} Z" class="ba-body"/>
      <circle cx="${fx-22}" cy="${gy-32}" r="13" class="ba-accent"/>
      <circle cx="${fx-22}" cy="${gy-32}" r="6" class="ba-cut"/>
      <path d="M${fx-30},${gy-44} L${fx-52},${gy-52}" class="ba-line"/>
      <path d="M${rx+34},${seatY-16} Q${rx+66},${seatY-22} ${rx+92},${seatY-12} L${rx+88},${seatY} L${rx+38},${seatY-2} Z" class="ba-accent" opacity=".85"/>`;
    case 'touring': return `
      <path d="M${rx-30},${gy-10} Q${rx-4},${seatY-16} ${rx+60},${seatY-14} L${rx+110},${seatY-10} Q${rx+150},${seatY-24} ${fx-36},${gy-26} L${fx-2},${gy-4} L${rx+90},${gy+8} Q${rx+8},${gy+6} ${rx-30},${gy-10} Z" class="ba-body"/>
      <path d="M${rx-46},${seatY+6} Q${rx-58},${seatY-30} ${rx-24},${seatY-6} L${rx-20},${gy-6} L${rx-40},${gy-2} Z" class="ba-accent"/>
      <ellipse cx="${rx+118}" cy="${gy-4}" rx="22" ry="16" class="ba-body" opacity=".9"/>
      <path d="M${fx-40},${gy-58} Q${fx-14},${gy-92} ${fx+8},${gy-56} L${fx-6},${gy-30} L${fx-30},${gy-30} Z" class="ba-cut"/>
      <circle cx="${fx-16}" cy="${gy-30}" r="10" class="ba-accent"/>`;
    case 'cruiser': return `
      <path d="M${rx-34},${gy-6} Q${rx+2},${seatY-2} ${rx+50},${seatY} L${rx+140},${seatY+2} Q${rx+190},${seatY-6} ${fx-40},${gy-20} L${fx+2},${gy-2} L${rx+100},${gy+10} Q${rx+20},${gy+8} ${rx-34},${gy-6} Z" class="ba-body"/>
      <ellipse cx="${rx+58}" cy="${seatY-8}" rx="30" ry="14" class="ba-accent" opacity=".85"/>
      <path d="M${fx-56},${gy-6} Q${fx-40},${gy-34} ${fx-10},${gy-24}" class="ba-line"/>
      <path d="M${rx+10},${gy+4} L${rx-2},${gy+18} M${rx+150},${gy+2} L${rx+162},${gy+16}" class="ba-line"/>
      <path d="M${rx+150},${seatY+8} Q${rx+150},${seatY-10} ${rx+170},${seatY-22}" class="ba-line ba-thick"/>`;
    case 'adventure': return `
      <path d="M${rx-20},${gy-16} Q${rx+4},${seatY-14} ${rx+55},${seatY-16} L${rx+100},${seatY-14} Q${rx+140},${seatY-34} ${fx-46},${gy-40} L${fx-10},${gy-14} L${rx+80},${gy} Q${rx+16},${gy-4} ${rx-20},${gy-16} Z" class="ba-body"/>
      <path d="M${fx-58},${gy-40} L${fx-30},${gy-64} L${fx-6},${gy-46} Z" class="ba-accent"/>
      <path d="M${fx-64},${gy-48} L${fx-40},${gy-78} L${fx-18},${gy-56}" class="ba-cut"/>
      <line x1="${rx-14}" y1="${gy-2}" x2="${rx-14}" y2="${gy-30}" class="ba-line ba-thick"/>
      <line x1="${fx-8}" y1="${gy-16}" x2="${fx-8}" y2="${gy-44}" class="ba-line ba-thick"/>
      <path d="M${rx+40},${seatY-18} Q${rx+68},${seatY-24} ${rx+92},${seatY-16}" class="ba-accent" opacity=".85" stroke-width="10" stroke="currentColor"/>`;
    case 'scooter': return `
      <path d="M${rx-10},${gy-2} Q${rx-6},${seatY+6} ${rx+30},${seatY+2} L${rx+70},${seatY} Q${rx+64},${gy-30} ${rx+96},${gy-26} Q${fx-46},${gy-24} ${fx-20},${gy-6} L${fx+4},${gy+4} L${rx+40},${gy+10} Q${rx+2},${gy+8} ${rx-10},${gy-2} Z" class="ba-body"/>
      <path d="M${fx-30},${gy-40} Q${fx-4},${gy-52} ${fx+10},${gy-24} L${fx-8},${gy-14} Z" class="ba-accent"/>
      <ellipse cx="${rx+40}" cy="${seatY-2}" rx="26" ry="10" class="ba-accent" opacity=".8"/>`;
    case 'classic': return `
      <path d="M${rx-16},${gy-8} Q${rx+6},${seatY} ${rx+46},${seatY-2} L${rx+90},${seatY+2} Q${rx+120},${seatY-16} ${fx-40},${gy-24} L${fx-6},${gy-6} L${rx+70},${gy+6} Q${rx+14},${gy+4} ${rx-16},${gy-8} Z" class="ba-body"/>
      <circle cx="${rx+66}" cy="${seatY-6}" r="18" class="ba-accent" opacity=".9"/>
      <circle cx="${fx-24}" cy="${gy-26}" r="12" class="ba-accent"/>
      <circle cx="${fx-24}" cy="${gy-26}" r="5" class="ba-cut"/>
      <path d="M${rx+8},${gy+2} Q${rx-10},${gy+16} ${rx-26},${gy+6}" class="ba-line ba-thick"/>`;
    case 'cross': return `
      <path d="M${rx-6},${gy-24} Q${rx+14},${seatY-20} ${rx+50},${seatY-22} L${rx+90},${seatY-20} Q${rx+120},${seatY-40} ${fx-48},${gy-52} L${fx-16},${gy-22} L${rx+76},${gy-6} Q${rx+18},${gy-10} ${rx-6},${gy-24} Z" class="ba-body"/>
      <path d="M${fx-58},${gy-52} L${fx-30},${gy-72} L${fx-8},${gy-58} Z" class="ba-accent"/>
      <rect x="${fx-40}" y="${gy-58}" width="20" height="12" rx="2" class="ba-cut"/>
      <line x1="${rx-2}" y1="${gy-16}" x2="${rx-2}" y2="${gy-42}" class="ba-line ba-thick"/>
      <line x1="${fx-14}" y1="${gy-22}" x2="${fx-14}" y2="${gy-50}" class="ba-line ba-thick"/>`;
    default: return '';
  }
}

function bikeArtSVG(type, opts){
  opts = opts || {};
  const t = BIKE_TYPES[type] ? type : 'naked';
  const p = BIKE_TYPES[t];
  const spokes = t === 'adventure' || t === 'classic' || t === 'cross';
  const flip = opts.flip ? ` transform="scale(-1,1) translate(-400,0)"` : '';
  return `<svg viewBox="0 0 400 240" xmlns="http://www.w3.org/2000/svg" class="ba-svg" role="img" aria-label="Illustration af motorcykel">
    <defs>
      <linearGradient id="baBg-${opts.id||t}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="var(--color-surface-2)"/>
        <stop offset="1" stop-color="var(--color-primary-tint)"/>
      </linearGradient>
    </defs>
    <rect width="400" height="240" fill="url(#baBg-${opts.id||t})"/>
    <line x1="20" y1="${p.gy+p.rr*0.86}" x2="380" y2="${p.gy+p.rr*0.86}" class="ba-ground"/>
    <g${flip}>
      ${bodyFor(t, p)}
      ${wheelSVG(p.rx, p.gy, p.rr, spokes)}
      ${wheelSVG(p.fx, p.gy, p.fr, spokes)}
    </g>
  </svg>`;
}

const TYPE_LABELS_DA = {
  sport: 'Sport', naked: 'Naked', touring: 'Touring', cruiser: 'Cruiser',
  adventure: 'Adventure/Enduro', scooter: 'Scooter', classic: 'Classic/Veteran', cross: 'Cross/MX',
};
