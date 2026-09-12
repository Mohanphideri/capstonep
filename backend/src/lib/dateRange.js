function parseDateRange(from,to){
  const now=new Date();
  const iso=(d)=>new Date(`${d}T00:00:00+05:30`);
  let start=from?iso(from):new Date(now.getTime()-6*86400000);
  let end=to?new Date(`${to}T23:59:59.999+05:30`):new Date();
  if(!from&&!to){start.setHours(0,0,0,0);}
  if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||start>end)return null;
  return {start,end};
}
module.exports={parseDateRange};
