const {dec}=require('./png-inventar.js');process.chdir(process.argv[2]);
for(const f of ['ChatGPT-billede 17. okt. 2026, 13.14.47-1.png','ChatGPT-billede 17. okt. 2026, 13.14.50-5.png','ChatGPT-billede 17. okt. 2026, 13.37.24-2.png']){
dec(f);const {out,w,h}=RAW;const hist={};const cols={};
for(let i=0;i<w*h;i++){const a=out[i*4+3];if(a>0){const k=a>>5;hist[k]=(hist[k]||0)+1;const c=[out[i*4]>>4,out[i*4+1]>>4,out[i*4+2]>>4].join(',');cols[c]=(cols[c]||0)+1;}}
console.log(f.slice(-9),JSON.stringify(hist),JSON.stringify(Object.entries(cols).sort((a,b)=>b[1]-a[1]).slice(0,3)));}
