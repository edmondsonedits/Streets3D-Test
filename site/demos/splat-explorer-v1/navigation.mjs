// Pure camera movement rules. All coordinates are local scene units.
export function stepPosition(position, {forward=0,right=0,up=0,yaw=0,pitch=0,distance=0,locked=true,referenceHeight=0}) {
 const f=[-Math.sin(yaw)*(locked?1:Math.cos(pitch)),locked?0:Math.sin(pitch),-Math.cos(yaw)*(locked?1:Math.cos(pitch))];
 const r=[Math.cos(yaw),0,-Math.sin(yaw)];
 const move=[f[0]*forward+r[0]*right,f[1]*forward+(locked?0:up),f[2]*forward+r[2]*right];
 const length=Math.hypot(...move);const scale=length>0?distance/Math.max(1,length):0;
 const result=position.map((v,i)=>v+move[i]*scale);if(locked)result[1]=referenceHeight;return result;
}
export function constrainHeight(position, locked, referenceHeight){return [position[0],locked?referenceHeight:position[1],position[2]];}
