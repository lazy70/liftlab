/* Browser ML, no remote services. Ridge regression on standardized inputs.
   Objective: sum squared errors + alpha * sum squared slopes. Intercept unpenalized. */
(function(root){
'use strict';
const common=['reservoir_mpa','depth_m','density','whp_mpa','pi','friction'];
const features={gas:[...common,'injection'],esp:[...common,'frequency','stages'],rod:[...common,'diameter','stroke','spm','fillage']};
const columns=['well_id','method',...common,'injection','frequency','stages','diameter','stroke','spm','fillage','liquid_rate'];
const bounds={reservoir_mpa:[.1,100],depth_m:[100,6000],density:[500,1500],whp_mpa:[0,50],pi:[.1,500],friction:[0,.01],injection:[0,40000],frequency:[30,70],stages:[1,500],diameter:[20,100],stroke:[.1,10],spm:[1,15],fillage:[.05,1],liquid_rate:[0,100000]};
function parseCSV(text){
 if(text.length>2*1024*1024)throw Error('CSV exceeds the 2 MB limit.');
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else {quoted=false;closed=true}}else cell+=c;}
  else if(c==='"'){if(cell||closed)throw Error('Malformed CSV quoting.');quoted=true;}
  else if(c===','||c==='\n'||c==='\r'){row.push(cell.trim());cell='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(v=>v!==''))rows.push(row);row=[];}}
  else {if(closed&&!/\s/.test(c))throw Error('Unexpected characters after a quoted field.');cell+=c;}
 }
 if(quoted)throw Error('CSV has an unclosed quoted field.');
 if(cell||row.length){row.push(cell.trim());if(row.some(v=>v!==''))rows.push(row)}
 if(rows.length<2)throw Error('CSV needs a header and at least one data row.');
 const header=rows.shift();if(new Set(header).size!==header.length)throw Error('Duplicate column names.');
 for(const c of ['well_id','method','liquid_rate',...common])if(!header.includes(c))throw Error('Missing required column: '+c);
 if(rows.length>5000)throw Error('Maximum 5,000 data rows.');
 const valid=[],issues=[],seen=new Set();let duplicates=0;
 rows.forEach((cells,i)=>{const n=i+2;if(cells.length!==header.length){issues.push(`Record ${n}: wrong column count`);return}
 const obj=Object.fromEntries(header.map((h,j)=>[h,cells[j]]));
 if(!obj.well_id||obj.well_id.length>100){issues.push(`Record ${n}: well_id is required (max 100 characters)`);return}
 if(!features[obj.method]){issues.push(`Record ${n}: method must be gas, esp or rod`);return}
 const rec={well_id:obj.well_id,method:obj.method};
 for(const key of [...features[obj.method],'liquid_rate']){const raw=obj[key],v=Number(raw);if(raw===undefined||raw===''||!Number.isFinite(v)||v<bounds[key][0]||v>bounds[key][1]){issues.push(`Record ${n}: ${key} missing or outside supported range ${bounds[key].join('–')}`);return}rec[key]=v}
 const key=JSON.stringify(rec);if(seen.has(key)){duplicates++;return}seen.add(key);valid.push(rec);
 });
 return {rows:valid,total:rows.length,issues,duplicates};
}
function random(seed=42){let a=seed>>>0;return ()=>{a=(1664525*a+1013904223)>>>0;return a/4294967296}}
function splitGroups(rows,seed=42){const groups=[...new Set(rows.map(r=>r.well_id))].sort();if(groups.length<5)throw Error('At least 5 distinct wells per method are required.');const rng=random(seed);for(let i=groups.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[groups[i],groups[j]]=[groups[j],groups[i]]}const testGroups=new Set(groups.slice(0,Math.max(1,Math.round(groups.length*.2))));return {train:rows.filter(r=>!testGroups.has(r.well_id)),test:rows.filter(r=>testGroups.has(r.well_id)),testGroups:[...testGroups]}}
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
function solve(A,b){const n=b.length;const m=A.map((r,i)=>[...r,b[i]]);for(let i=0;i<n;i++){let pivot=i;for(let k=i+1;k<n;k++)if(Math.abs(m[k][i])>Math.abs(m[pivot][i]))pivot=k;[m[i],m[pivot]]=[m[pivot],m[i]];if(Math.abs(m[i][i])<1e-12)throw Error('Ill-conditioned model. More varied data are needed.');const d=m[i][i];for(let j=i;j<=n;j++)m[i][j]/=d;for(let k=0;k<n;k++)if(k!==i){const f=m[k][i];for(let j=i;j<=n;j++)m[k][j]-=f*m[i][j]}}return m.map(r=>r[n])}
function fit(rows,keys,alpha=1){
 if(!(alpha>0))throw Error('Ridge alpha must be positive.');
 const means=keys.map(k=>mean(rows.map(r=>r[k]))),scales=keys.map((k,j)=>Math.sqrt(mean(rows.map(r=>(r[k]-means[j])**2)))||1),ranges=keys.map(k=>[Math.min(...rows.map(r=>r[k])),Math.max(...rows.map(r=>r[k]))]);
 const X=rows.map(r=>[1,...keys.map((k,j)=>(r[k]-means[j])/scales[j])]),n=keys.length+1,A=Array.from({length:n},()=>Array(n).fill(0)),b=Array(n).fill(0);
 X.forEach((x,i)=>{for(let j=0;j<n;j++){b[j]+=x[j]*rows[i].liquid_rate;for(let k=0;k<n;k++)A[j][k]+=x[j]*x[k]}});for(let j=1;j<n;j++)A[j][j]+=alpha;
 const coef=solve(A,b);return {features:keys,means,scales,ranges,coefficients:coef,alpha};
}
function predict(model,row){let raw=model.coefficients[0];const outside=[];model.features.forEach((k,j)=>{const v=row[k];if(!Number.isFinite(v))throw Error('Prediction input missing: '+k);raw+=model.coefficients[j+1]*(v-model.means[j])/model.scales[j];if(v<model.ranges[j][0]||v>model.ranges[j][1])outside.push(k)});return {raw,rate:Math.max(0,raw),outside,clipped:raw<0}}
function metrics(actual,pred){const avg=mean(actual),sse=actual.reduce((s,v,i)=>s+(v-pred[i])**2,0),sst=actual.reduce((s,v)=>s+(v-avg)**2,0);return {mae:mean(actual.map((v,i)=>Math.abs(v-pred[i]))),rmse:Math.sqrt(sse/actual.length),r2:sst>1e-12?1-sse/sst:null}}
function train(rows,method,provenance){const data=rows.filter(r=>r.method===method);if(data.length<30)throw Error('At least 30 valid records for '+method+' are required.');const split=splitGroups(data);if(split.train.length<20||split.test.length<5)throw Error('Need at least 20 training and 5 held-out records. Add more wells.');const model=fit(split.train,features[method]);const actual=split.test.map(r=>r.liquid_rate),pred=split.test.map(r=>predict(model,r).rate),baseline=mean(split.train.map(r=>r.liquid_rate));return {...model,method,provenance,createdAt:new Date().toISOString(),splitSeed:42,trainCount:split.train.length,testCount:split.test.length,trainWells:[...new Set(split.train.map(r=>r.well_id))],testWells:split.testGroups,metrics:metrics(actual,pred),baseline:metrics(actual,actual.map(()=>baseline)),testPairs:actual.map((a,i)=>({actual:a,predicted:pred[i],well_id:split.test[i].well_id})),trainMean:baseline,trainingRows:split.train};}
function summarize(rows,method){const data=rows.filter(r=>r.method===method);return features[method].concat('liquid_rate').map(key=>{const a=data.map(r=>r[key]);if(!a.length)return {key,n:0};const avg=mean(a),sorted=[...a].sort((a,b)=>a-b),y=data.map(r=>r.liquid_rate),ym=mean(y),cov=a.reduce((s,v,i)=>s+(v-avg)*(y[i]-ym),0),den=Math.sqrt(a.reduce((s,v)=>s+(v-avg)**2,0)*y.reduce((s,v)=>s+(v-ym)**2,0));return {key,n:a.length,min:sorted[0],max:sorted.at(-1),mean:avg,median:sorted.length%2?sorted[(sorted.length-1)/2]:(sorted[sorted.length/2-1]+sorted[sorted.length/2])/2,correlation:den?cov/den:null}})}
function synthetic(simulate){const rng=random(73),rows=[],range=(lo,hi)=>lo+rng()*(hi-lo);for(let i=0;i<120;i++){const well={reservoir_mpa:range(8,28),depth_m:range(800,2600),density:range(700,1050),whp_mpa:range(.2,2),pi:range(15,75),friction:range(.000005,.00004)};for(let obs=0;obs<2;obs++){const settings={injection:range(1000,35000),frequency:range(35,65),stages:Math.round(range(100,350)),diameter:range(30,65),stroke:range(1.5,4),spm:range(3,12),fillage:range(.55,.95)};const r=simulate({well,settings});for(const method of ['gas','esp','rod'])rows.push({well_id:'SYNTH-'+String(i+1).padStart(3,'0'),method,...well,...settings,liquid_rate:Math.max(0,r[method].rate*(1+range(-.06,.06)))})}}return rows}
function csv(rows){const escape=v=>'"'+String(v??'').replaceAll('"','""')+'"';return [columns.join(','),...rows.map(r=>columns.map(k=>escape(r[k])).join(','))].join('\n')}
const api={features,columns,bounds,parseCSV,splitGroups,fit,predict,metrics,train,summarize,synthetic,csv};if(typeof module!=='undefined')module.exports=api;else root.LiftML=api;
})(typeof globalThis!=='undefined'?globalThis:this);
