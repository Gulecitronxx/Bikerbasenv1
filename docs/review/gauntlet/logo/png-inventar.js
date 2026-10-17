const fs=require('fs'),zlib=require('zlib');
function dec(f){const b=fs.readFileSync(f);let p=8,idat=[],w,h;while(p<b.length){const l=b.readUInt32BE(p),t=b.toString('ascii',p+4,p+8);if(t==='IHDR'){w=b.readUInt32BE(p+8);h=b.readUInt32BE(p+12);}if(t==='IDAT')idat.push(b.slice(p+8,p+8+l));p+=12+l;}
const raw=zlib.inflateSync(Buffer.concat(idat));const bpp=4,st=w*bpp;const out=Buffer.alloc(h*st);let prev=Buffer.alloc(st);
for(let y=0;y<h;y++){const ft=raw[y*(st+1)];const line=raw.slice(y*(st+1)+1,(y+1)*(st+1));const cur=out.slice(y*st,(y+1)*st);
for(let x=0;x<st;x++){const a=x>=bpp?cur[x-bpp]:0,up=prev[x],c=x>=bpp?prev[x-bpp]:0;let v=line[x];
if(ft===1)v+=a;else if(ft===2)v+=up;else if(ft===3)v+=((a+up)>>1);else if(ft===4){const pp=a+up-c,pa=Math.abs(pp-a),pb=Math.abs(pp-up),pc=Math.abs(pp-c);v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?up:c);}cur[x]=v&255;}prev=cur;}
let tr=0,op=0,semi=0,minx=w,miny=h,maxx=0,maxy=0,dark=0,lum=0,n=0;
for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,a=out[i+3];if(a===0)tr++;else if(a===255)op++;else semi++;
const L=(out[i]+out[i+1]+out[i+2])/3;const ink=(a>128&&L<128);if(ink){dark++;if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;}}
global.RAW={out,w,h};return {w,h,transp:(tr/(w*h)*100).toFixed(1),opaque:(op/(w*h)*100).toFixed(1),semi:(semi/(w*h)*100).toFixed(1),ink:(dark/(w*h)*100).toFixed(1),bbox:[minx,miny,maxx,maxy].join(','),corner:[out[0],out[1],out[2],out[3]].join('/')};}
module.exports={dec};if(require.main===module)for(const f of fs.readdirSync(process.argv[2]).filter(f=>f.startsWith("ChatGPT"))){process.chdir(process.argv[2]);console.log(f.replace("ChatGPT-billede 17. okt. 2026, ",""),JSON.stringify(dec(f)));}
