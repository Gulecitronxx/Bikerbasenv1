// Bruges: node crop.js <in.png> <x> <y> <w> <h> <scale> <out.png>  (RGB/RGBA 8-bit PNG, nearest-neighbour opskalering)
const fs=require('fs'),zlib=require('zlib');
const [,, inp,X,Y,W,H,S,outp]=process.argv;const x0=+X,y0=+Y,cw=+W,ch=+H,sc=+S;
const b=fs.readFileSync(inp);let p=8,idat=[],w,h,ct;while(p<b.length){const l=b.readUInt32BE(p),t=b.toString('ascii',p+4,p+8);if(t==='IHDR'){w=b.readUInt32BE(p+8);h=b.readUInt32BE(p+12);ct=b[p+17];}if(t==='IDAT')idat.push(b.slice(p+8,p+8+l));p+=12+l;}
const bpp=ct===6?4:3,st=w*bpp,raw=zlib.inflateSync(Buffer.concat(idat)),out=Buffer.alloc(h*st);let prev=Buffer.alloc(st);
for(let y=0;y<h;y++){const ft=raw[y*(st+1)],line=raw.slice(y*(st+1)+1,(y+1)*(st+1)),cur=out.slice(y*st,(y+1)*st);
for(let x=0;x<st;x++){const a=x>=bpp?cur[x-bpp]:0,up=prev[x],c=x>=bpp?prev[x-bpp]:0;let v=line[x];
if(ft===1)v+=a;else if(ft===2)v+=up;else if(ft===3)v+=((a+up)>>1);else if(ft===4){const pp=a+up-c,pa=Math.abs(pp-a),pb=Math.abs(pp-up),pc=Math.abs(pp-c);v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?up:c);}cur[x]=v&255;}prev=cur;}
const ow=cw*sc,oh=ch*sc,ost=ow*3,o=Buffer.alloc(oh*(ost+1));
for(let y=0;y<oh;y++){o[y*(ost+1)]=0;for(let x=0;x<ow;x++){const sx=x0+Math.floor(x/sc),sy=y0+Math.floor(y/sc);const i=(sy*w+sx)*bpp;const d=y*(ost+1)+1+x*3;o[d]=out[i];o[d+1]=out[i+1];o[d+2]=out[i+2];}}
function crc(buf){let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}let r=0xffffffff;for(const x of buf)r=t[(r^x)&255]^(r>>>8);return (r^0xffffffff)>>>0;}
function chunk(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length);const td=Buffer.concat([Buffer.from(t),d]);const c=Buffer.alloc(4);c.writeUInt32BE(crc(td));return Buffer.concat([l,td,c]);}
const ih=Buffer.alloc(13);ih.writeUInt32BE(ow,0);ih.writeUInt32BE(oh,4);ih[8]=8;ih[9]=2;
fs.writeFileSync(outp,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(o)),chunk('IEND',Buffer.alloc(0))]));
