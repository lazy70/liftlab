
// Browser equivalent of models.py. Same SI units and educational assumptions.
function simulate(data={}) {
 const w={reservoir_mpa:16,depth_m:1800,density:850,whp_mpa:1,pi:35,friction:.00002,...data.well};
 const s={injection:10000,frequency:50,stages:200,spm:8,diameter:44,stroke:2.5,fillage:.8,...data.settings};
 for(const [k,v] of Object.entries({...w,...s}))if(!Number.isFinite(v)||v<0)throw Error(k+' must be finite and nonnegative');
 for(const k of ['reservoir_mpa','depth_m','density','pi'])if(w[k]<=0)throw Error(k+' must be positive');
 for(const k of ['frequency','stages','spm','diameter','stroke','fillage'])if(s[k]<=0)throw Error(k+' must be positive');
 if(s.fillage>1)throw Error('Fillage cannot exceed 1');
 const g=9.80665, inflow=q=>w.reservoir_mpa-q/w.pi;
 const outflow=(q,rho=w.density)=>w.whp_mpa+rho*g*w.depth_m/1e6+w.friction*q*q;
 function solve(required,upper=w.pi*w.reservoir_mpa){let hi=Math.min(upper,w.pi*w.reservoir_mpa),lo=0;if(inflow(0)<=required(0))return 0;if(inflow(hi)>=required(hi))return hi;for(let i=0;i<80;i++){let mid=(lo+hi)/2;if(inflow(mid)>required(mid))lo=mid;else hi=mid}return (lo+hi)/2}
 function gas(injection){const alpha=.65*injection/(injection+10000),rho=w.density*(1-alpha),penalty=2e-9*injection**2,q=solve(q=>outflow(q,rho)+penalty);return {rate:q,pwf:inflow(q),density:rho,gas_fraction:alpha,penalty}}
 function esp(frequency){const head=q=>s.stages*12*Math.max(0,(frequency/50)**2-(q/400)**2),runout=400*frequency/50,q=solve(q=>outflow(q)-w.density*g*head(q)/1e6,runout),limited=q>=runout*(1-1e-9);return {rate:q,pwf:inflow(q),head:head(q),power:w.density*g*(q/86400)*head(q)/.65/1000,limited,status:limited?'Outside pump curve: runout bound':q===0?'No flowing solution':'Pressure balance solved'}}
 function rod(spm){const area=Math.PI*(s.diameter/1000)**2/4,displacement=area*s.stroke*spm*1440,capacity=displacement*s.fillage,supply=Math.max(0,w.pi*(w.reservoir_mpa-1)),q=Math.min(capacity,supply),boost=Math.max(0,outflow(q)-inflow(q));return {rate:q,pwf:inflow(q),displacement,capacity,power:boost*1e6*q/86400/.65/1000,load:boost*1e6*area/1000,limited:capacity>supply,boost}}
 return {natural:solve(outflow),gas:gas(s.injection),esp:esp(s.frequency),rod:rod(s.spm),curves:{gas:Array.from({length:41},(_,i)=>[i*1000,gas(i*1000).rate]),esp:Array.from({length:41},(_,i)=>[i+30,esp(i+30).rate]),rod:Array.from({length:29},(_,i)=>[(i+2)/2,rod((i+2)/2).rate])},inputs:{well:w,settings:s}};
}


if (typeof module !== "undefined") module.exports = {simulate};
