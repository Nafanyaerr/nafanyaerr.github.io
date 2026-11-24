import { makeFloralBorder } from './floral-border.mjs';
// A drawn loom, in integer stitch cells. Density changes by introducing ordered
// diagonal hatch lines, never by stacking copies or changing the cross size.
const SHOOTS = {
  callgrid: [['left',.18,20,-8],['left',.76,11,4],['right',.32,13,-3],['right',.86,24,9],['bottom',.27,22,-7],['bottom',.78,12,4]],
  reports: [['top',.28,23,-8],['top',.79,12,3],['left',.22,12,-4],['left',.77,26,7],['right',.42,18,5],['bottom',.64,24,9]],
  mobile: [['top',.68,20,6],['left',.15,22,-8],['left',.68,13,5],['right',.36,26,-9],['right',.87,14,6],['bottom',.34,23,-7]],
  crm: [['top',.37,17,-7],['left',.27,25,-8],['left',.86,13,3],['right',.17,12,5],['right',.73,25,9],['bottom',.55,23,-9]],
  academy: [['top',.73,25,8],['left',.15,13,-4],['left',.70,25,8],['right',.33,21,-6],['bottom',.19,14,-4],['bottom',.72,23,7]],
  city: [['top',.20,21,-7],['top',.73,13,3],['left',.36,26,-9],['right',.20,13,-4],['right',.78,24,8],['bottom',.61,22,8]]
};
const mod=(n,p)=>((n%p)+p)%p;
const fold=(n,p)=>Math.abs(mod(n,p)-p/2);
const tri=(n,p)=>fold(n,p)/(p/2);
const PHASE={callgrid:0,reports:4,mobile:8,crm:2,academy:6,city:10};

// The folds are integer constructions of leaves, interlacing knots and
// chevrons. Every visible diagonal is still made from the same whole glyph.
function loom(name,x,y) {
  switch(name) {
    case 'reports': return [x+y+6*Math.floor((x-y)/24),x-y];
    case 'mobile': return [x+fold(y,24),x+6];
    case 'crm': return [y+fold(x,24),y+6+6*Math.floor(x/24)];
    case 'academy': return [fold(x,24)+fold(y,24),Math.abs(fold(x,24)-fold(y,24))+6];
    case 'city': return [x+fold(y,36),x-fold(y,36)+6];
    default: return [x+y,x-y];
  }
}

function drawnHatch(name,x,y,depth) {
  const [u,v]=loom(name,x+PHASE[name],y), a=mod(u,12), b=mod(v,12);
  // Far: one diagonal in twelve. Middle: add the halfway line. Near:
  // quarter lines and selected paired threads make a fuller woven ground.
  if(a===0||b===0)return true;
  if((a===6&&depth<12+4*tri(v,24))||(b===6&&depth<12+4*tri(u,24)))return true;
  if(([3,9].includes(a)&&depth<5+3*tri(v,24))||([3,9].includes(b)&&depth<5+3*tri(u,24)))return true;
  if([1,4,7,10].includes(a)&&depth<2+2*tri(v,24))return true;
  return false;
}

export function makePatternField(name,motif,width,height,leftRoom,rightRoom) {
  if(name==='callgrid')return makeFloralBorder(width,height,leftRoom,rightRoom);
  const shoots=SHOOTS[name]||SHOOTS.callgrid;
  const phase=PHASE[name]||0;
  const minX=Math.max(-Math.floor(leftRoom),-30),maxX=Math.min(Math.floor(width+rightRoom-1),Math.ceil(width)+30);
  const minY=name==='callgrid'?-8:-30,maxY=Math.ceil(height)+30;
  const eligible=(x,y)=>x>=-leftRoom&&x+1<=width+rightRoom&&(x+1<=0||x>=width||y+1<=0||y>=height)&&(name!=='callgrid'||y>=-8);
  const inside=(x,y)=>{
    const sides=[['left',-x-.5,y+.5,height],['right',x+.5-width,y+.5,height],['top',-y-.5,x+.5,width],['bottom',y+.5-height,x+.5,width]];
    for(const [side,depth,along,length]of sides) {
      if(depth<0||along<-7||along>length+7)continue;
      const room=side==='left'?leftRoom:side==='right'?rightRoom:side==='top'&&name==='callgrid'?9:31;
      if(room<5)continue;
      // Re-form the contour in the available space instead of cutting a
      // full-width hatch field off at a straight viewport boundary.
      const rootReach=Math.min(13,Math.max(0,room-1));
      // A shallow, scalloped root gives room for dense stitching without
      // drawing a solid rectangular frame.
      if(along>=0&&along<=length&&depth<rootReach*(9/13+4/13*tri(along+phase,24)))return true;
      for(const [direction,t,reach,lean]of shoots) {
        const localReach=Math.min(reach,room-1);
        if(direction!==side||localReach<5||depth>localReach)continue;
        const axis=length*t+lean*depth/localReach;
        const halfWidth=(localReach-depth)*.9+1;
        if(Math.abs(along-axis)<=halfWidth)return true;
      }
    }
    return false;
  };
  const result=[];
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++) {
    if(!eligible(x,y)||!inside(x,y))continue;
    const depth=Math.max(0,-x-.5,x+.5-width,-y-.5,y+.5-height);
    // Outer shoots finish in a continuous stitched leaf/diamond outline.
    const outline=depth>9&&(!inside(x-1,y)||!inside(x+1,y)||!inside(x,y-1)||!inside(x,y+1));
    if(outline||drawnHatch(name,x,y,depth))result.push([x,y]);
  }
  return result;
}
