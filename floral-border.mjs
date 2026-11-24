// Quarter-petal blossom transcribed from the supplied embroidered border.
// Coordinates are stitch cells. The caller renders every cross at 8.25 px.
const FLOWER=['.X.X.','XX.XX','..X..','XX.XX','.X.X.'];
const BUD=[[0,0],[-1,1],[1,1],[-2,2],[2,2],[-1,3],[1,3],[0,4],[0,5],[0,6]];

function garland(length,withBud) {
  const points=new Map();
  const add=(x,y)=>points.set(`${x},${y}`,[x,y]);
  const middle=Math.floor((length-1)/2),nodes=[];
  for(let n=-Math.ceil(length/14);n<=Math.ceil(length/14);n++) {
    const x=middle+n*7;
    // A complete blossom always fits inside the strip; nothing is sliced.
    if(x-2<0||x+2>=length)continue;
    const bud=withBud&&n===0;
    const high=withBud?Math.abs(n)%2===1:n%2===0;
    const cy=high?2:5;
    if(bud)for(const[dx,y]of BUD)add(x+dx,y);
    else for(let y=0;y<5;y++)for(let dx=0;dx<5;dx++)if(FLOWER[y][dx]==='X')add(x+dx-2,cy+y-2);
    nodes.push({x,bud,high});
  }
  for(let i=1;i<nodes.length;i++) {
    const a=nodes[i-1],b=nodes[i];
    if(b.x-a.x!==7)continue;
    if(a.bud||b.bud) {
      // Paired stems sweep below the upright central diamond and curl back
      // toward the adjacent blossoms, as in the reference's centre panel.
      const bud=a.bud?a:b,other=a.bud?b:a,dir=Math.sign(other.x-bud.x);
      for(const[dx,y]of [[0,6],[1,7],[2,7],[3,7],[4,6],[5,6],[6,5]])add(bud.x+dx*dir,y);
      for(const[dx,y]of [[3,4],[4,3],[5,3],[5,4]])add(bud.x+dx*dir,y);
    } else {
      // A stepped S-shaped vine joins alternating upper and lower flowers.
      const high=a.high?a:b,dir=a.high?1:-1;
      for(const[dx,y]of [[1,4],[2,5],[3,6],[4,6],[5,6]])add(high.x+dx*dir,y);
      for(const[dx,y]of [[2,3],[3,3],[4,4]])add(high.x+dx*dir,y);
    }
  }
  return [...points.values()];
}

export function makeFloralBorder(width,height,leftRoom,rightRoom) {
  const cells=new Map();
  const add=(x,y)=>{
    if(!Number.isInteger(x)||!Number.isInteger(y))throw Error('Floral stitch must be an integer cell');
    if(x< -leftRoom||x+1>width+rightRoom||y< -8)return;
    if(!(x+1<=0||x>=width||y+1<=0||y>=height))return;
    cells.set(`${x},${y}`,[x,y]);
  };
  const cols=Math.floor(width),rows=Math.floor(height),right=Math.ceil(width),bottom=Math.ceil(height);
  for(const[x,depth]of garland(cols,true)) {
    add(x,-8+depth);
    add(x,bottom+7-depth);
  }
  // The same garland is turned by grid-coordinate exchange, never SVG
  // scaling. Omit a side as a complete strip if the viewport lacks room.
  for(const[along,depth]of garland(rows,false)) {
    if(leftRoom>=8)add(-8+depth,along);
    if(rightRoom>=right-width+8)add(right+7-depth,along);
  }
  return [...cells.values()].sort((a,b)=>a[1]-b[1]||a[0]-b[0]);
}
