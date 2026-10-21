"""Deterministic geographic test extract. Requires Python 3, Shapely 2.1, Pillow, numpy.
Input is a read-only city-explorer source snapshot of SOURCE_COMMIT.
"""
import argparse, json, math, re, hashlib, heapq, gzip
from pathlib import Path
from collections import defaultdict
import numpy as np
from PIL import Image
from shapely.geometry import Polygon, LineString, Point, shape, mapping
from shapely.ops import transform, unary_union, split, polygonize
from shapely import constrained_delaunay_triangles
SOURCE_COMMIT='3754f99a0e59cd97b35d5e64ac31ac26c6bbbde8'
R=6378137.
STREETS=['Ford Street','Brown Street','High Street',"St. Mary's Street"]

def write(p,data):
 p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8',newline='\n')
def polygons(g):
 if g.geom_type=='Polygon': yield g
 elif hasattr(g,'geoms'):
  for c in g.geoms: yield from polygons(c)
def lines(g):
 if g.geom_type=='LineString': yield g
 elif hasattr(g,'geoms'):
  for c in g.geoms: yield from lines(c)
def rounded(p): return [[round(x,3),round(z,3)]for x,z,*_ in p]
def rings(p): return [rounded(p.exterior.coords)]+[rounded(h.coords) for h in p.interiors]
def number(v):
 try:return float(re.search(r'[-+]?\d+(?:\.\d+)?',str(v)).group())
 except (AttributeError,ValueError):return None

def build(src,out):
 load=lambda name:json.loads((src/name).read_text(encoding='utf-8-sig'))
 roads=load('data/osm-public-roads.geojson')['features']
 # Corners are shared source centerline vertices, not traced screenshot pixels.
 named={name:[f for f in roads if f['properties'].get('name')==name]for name in STREETS}
 corners=[]
 for a,b in [('Ford Street',"St. Mary's Street"),('Ford Street','Brown Street'),('Brown Street','High Street'),('High Street',"St. Mary's Street")]:
  ca={tuple(p) for f in named[a] for p in f['geometry']['coordinates']}
  cb={tuple(p) for f in named[b] for p in f['geometry']['coordinates']}
  common=sorted(ca&cb)
  # Brown has a jog on High. The lower Brown/Ford-connected branch is the screenshot's block edge.
  if (a,b)==('Brown Street','High Street'):common=[p for p in common if p[1]<44.2901]
  if a=='High Street' and b==STREETS[3]:common=[min(common)] # western St. Mary's branch connects Ford\n  if len(common)!=1: raise ValueError((a,b,common))
  corners.append(common[0])
 lon0=sum(p[0] for p in corners)/4;lat0=sum(p[1] for p in corners)/4
 scaleX=R*math.cos(math.radians(lat0))*math.pi/180; scaleZ=R*math.pi/180
 def proj(x,y,z=None):return ((np.asarray(x)-lon0)*scaleX,(lat0-np.asarray(y))*scaleZ)
 def inv(x,z):return (np.asarray(x)/scaleX+lon0,lat0-np.asarray(z)/scaleZ)
 # Restrict each leg to the named street, preserving every real intermediate bend.
 route_ll=[];legs=[]
 for idx,name in enumerate(STREETS):
  start=corners[idx];end=corners[(idx+1)%4];graph=defaultdict(list)
  for f in named[name]:
   coords=[tuple(p)for p in f['geometry']['coordinates']]
   for a,b in zip(coords,coords[1:]):
    dist=math.dist(proj(*a),proj(*b));graph[a].append((b,dist));graph[b].append((a,dist))
  heap=[(0,start)];best={start:0};prev={}
  while heap:
   dist,node=heapq.heappop(heap)
   if node==end:break
   if dist!=best[node]:continue
   for n,w in graph[node]:
    if dist+w<best.get(n,float('inf')):best[n]=dist+w;prev[n]=node;heapq.heappush(heap,(dist+w,n))
  if end not in best:raise ValueError('Unconnected street '+name)
  path=[end]
  while path[-1]!=start:path.append(prev[path[-1]])
  path.reverse();route_ll.extend(path if not route_ll else path[1:]);legs.append({'name':name,'lengthMetres':round(best[end],2)})
 route_local=[proj(*p)for p in route_ll];perimeter=Polygon(route_local)
 assert perimeter.is_valid
 area=perimeter.buffer(45,join_style=2)
 xmin,zmin,xmax,zmax=area.bounds
 # Whole terrain rectangle includes selected houses; no hidden city-wide requests.
 xmin,zmin=math.floor(xmin-12),math.floor(zmin-12);xmax,zmax=math.ceil(xmax+12),math.ceil(zmax+12)
 tm=load('data/terrain/peterborough-dtm-2025.json');im=np.asarray(Image.open(src/'data/terrain/peterborough-dtm-2025-terrarium.png').convert('RGB'),dtype=float)
 raw=im[:,:,0]*256+im[:,:,1]+im[:,:,2]/256-32768;mb=tm['bounds']['webMercatorEpsg3857']
 def elevation(x,z):
  lon,lat=inv(x,z);mx=R*math.radians(float(lon));my=R*math.log(math.tan(math.pi/4+math.radians(float(lat))/2))
  px=(mx-mb['xmin'])/(mb['xmax']-mb['xmin'])*raw.shape[1]-.5;py=(mb['ymax']-my)/(mb['ymax']-mb['ymin'])*raw.shape[0]-.5
  ix=max(0,min(raw.shape[1]-2,math.floor(px)));iy=max(0,min(raw.shape[0]-2,math.floor(py)));fx=max(0,min(1,px-ix));fy=max(0,min(1,py-iy))
  return float((raw[iy,ix]*(1-fx)+raw[iy,ix+1]*fx)*(1-fy)+(raw[iy+1,ix]*(1-fx)+raw[iy+1,ix+1]*fx)*fy)
 base=round(elevation(0,0),3)
 cols=math.ceil((xmax-xmin)/6)+1;rows=math.ceil((zmax-zmin)/6)+1
 terrain={'cols':cols,'rows':rows,'xMin':xmin,'xMax':xmax,'zMin':zmin,'zMax':zmax,'heights':[round(elevation(x,z)-base,3)for z in np.linspace(zmin,zmax,rows) for x in np.linspace(xmin,xmax,cols)],'sourceSpacingMetresApprox':8.3,'sampleSpacingMetresMax':6}
 def ground(x,z):
  fx=(x-xmin)/(xmax-xmin)*(cols-1);fz=(z-zmin)/(zmax-zmin)*(rows-1);ix=max(0,min(cols-2,math.floor(fx)));iz=max(0,min(rows-2,math.floor(fz)));a=max(0,min(1,fx-ix));b=max(0,min(1,fz-iz));h=terrain['heights']
  return h[iz*cols+ix]+a*(h[iz*cols+ix+1]-h[iz*cols+ix])+b*(h[(iz+1)*cols+ix]-h[iz*cols+ix]) if a+b<=1 else h[(iz+1)*cols+ix+1]+(1-a)*(h[(iz+1)*cols+ix]-h[(iz+1)*cols+ix+1])+(1-b)*(h[iz*cols+ix+1]-h[(iz+1)*cols+ix+1])
 road_records=[];road_polys=[];geo=[];anchors=[]
 for f in roads:
  geom=transform(proj,shape(f['geometry']))
  if not geom.intersects(area):continue
  tags=f['properties'];lanes=number(tags.get('lanes'))or 2;width=number(tags.get('width'))or max(5.5,min(15,lanes*3.05+1.3))
  for j,line in enumerate(lines(geom.intersection(area))):
   road_records.append({'id':f"osm-way/{tags['osm_id']}:{j}",'name':tags.get('name','Unnamed road'),'points':rounded(line.coords),'width':width,'widthEstimated':number(tags.get('width'))is None})
   road_polys.append(line.buffer(width/2,cap_style=1,join_style=1).intersection(area))
  geo.append({'type':'Feature','id':f"osm-way/{tags['osm_id']}",'properties':{**tags,'featureRole':'road-centerline'},'geometry':f['geometry']})
  if tags.get('name') and not any(a['name']==tags['name']for a in anchors):
   mid=geom.intersection(area).interpolate(.5,normalized=True);anchors.append({'name':tags['name'],'x':round(mid.x,3),'z':round(mid.y,3)})
 def triangle_positions(poly,height,max_edge=5):
  result=[]
  def add(v,depth=0):
   ds=[math.dist(v[i],v[(i+1)%3])for i in range(3)];i=max(range(3),key=ds.__getitem__)
   if ds[i]>max_edge and depth<16:
    a,b,c=v[i],v[(i+1)%3],v[(i+2)%3];m=((a[0]+b[0])/2,(a[1]+b[1])/2);add([a,m,c],depth+1);add([m,b,c],depth+1)
   else:
    # XZ orientation reversed for upward normal. DoubleSide is still robust.
    a,b,c=v
    if (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])>0:v=[a,c,b]
    for x,z in v:result.extend([round(x,3),round(height(x,z),3),round(z,3)])
  for tri in constrained_delaunay_triangles(poly).geoms:add(list(tri.exterior.coords)[:3])
  return result
 union=unary_union(road_polys)
 road_positions=[]
 # Clip roads to the same terrain triangles used by the renderer, then offset.
 # Sampling only road vertices permits the land mesh to cross road interiors.
 for row in range(rows-1):
  za=zmin+(zmax-zmin)*row/(rows-1);zb=zmin+(zmax-zmin)*(row+1)/(rows-1)
  for col in range(cols-1):
   xa=xmin+(xmax-xmin)*col/(cols-1);xb=xmin+(xmax-xmin)*(col+1)/(cols-1)
   for cell in [Polygon([(xa,za),(xa,zb),(xb,za)]),Polygon([(xb,za),(xa,zb),(xb,zb)])]:
    if not union.intersects(cell):continue
    for pp in polygons(union.intersection(cell)):
     if pp.area>1e-8:road_positions.extend(triangle_positions(pp,lambda x,z:ground(x,z)+.06,max_edge=1000))
 osm=load('data/peterborough-osm.json')['elements'];relations=[];used=set()
 for e in osm:
  if e['type']!='relation' or not e.get('tags',{}).get('building'):continue
  outer=[];inner=[]
  for member in e.get('members',[]):
   coords=[(v['lon'],v['lat'])for v in member.get('geometry',[]) if v]
   if len(coords)>1:(inner if member.get('role')=='inner' else outer).append(LineString(coords));used.add(member.get('ref'))
  for p in polygonize(unary_union(outer)):
   for h in polygonize(unary_union(inner)):p=p.difference(h)
   relations.append((f"osm-relation/{e['id']}",e['tags'],p))
 candidates=relations+[(f"osm-way/{e['id']}",e['tags'],Polygon([(v['lon'],v['lat'])for v in e['geometry']]))for e in osm if e['type']=='way' and e.get('tags',{}).get('building') and e['id']not in used and len(e.get('geometry',[]))>3]
 buildings=[]
 for id,tags,ll in candidates:
  local=transform(proj,ll)
  if local.is_empty or not local.is_valid or not local.intersects(area):continue
  for part,p in enumerate(polygons(local)):
   if p.area<4:continue
   bid=id if part==0 else f'{id}:{part}';btype=tags.get('building','yes');height=number(tags.get('height'));levels=number(tags.get('building:levels'))
   kind='osm-height' if height is not None else 'osm-levels' if levels is not None else 'estimated'
   seed=int(hashlib.sha256(bid.encode()).hexdigest()[:8],16)/0xffffffff
   total=height if height is not None else levels*3.15 if levels is not None else 3.2 if btype in ['garage','shed','carport'] else 7.2+seed*1.6
   roof=tags.get('roof:shape','flat'if btype in ['garage','shed','commercial','industrial','retail','apartments','school']else'gabled')
   rise=number(tags.get('roof:height'))
   if rise is None:rise=0 if roof=='flat'else min(2.2,total*.23)
   wall=max(2.6,min(115,total-rise));ringslocal=rings(p);llpart=transform(inv,p)
   foundation=max(ground(x,z)for x,z in p.exterior.coords);top=foundation+wall
   walls=[]
   for ring in [p.exterior,*p.interiors]:
    for (ax,az),(bx,bz) in zip(ring.coords, list(ring.coords)[1:]):
     a=[ax,ground(ax,az)-.12,az];b=[bx,ground(bx,bz)-.12,bz];c=[bx,top,bz];d=[ax,top,az]
     for v in [a,b,c,a,c,d]:walls.extend(round(i,3)for i in v)
   # Roof surfaces stay exactly inside original polygons, including concave footprints and holes.
   rect=list(p.minimum_rotated_rectangle.exterior.coords);edges=[math.dist(a,b)for a,b in zip(rect,rect[1:])];i=max(range(4),key=edges.__getitem__);a=rect[i];b=rect[(i+1)%4];ux=(b[0]-a[0])/edges[i];uz=(b[1]-a[1])/edges[i];nx=-uz;nz=ux
   ds=[x*nx+z*nz for x,z in rect[:-1]];mid=(min(ds)+max(ds))/2;half=max(.1,(max(ds)-min(ds))/2);center=p.centroid;offset=mid-(center.x*nx+center.y*nz);cx=center.x+offset*nx;cz=center.y+offset*nz
   roofheight=lambda x,z:top+(rise*max(0,1-abs(x*nx+z*nz-mid)/half)if roof!='flat'else .12)
   # Close gable ends along the complete footprint, splitting edges at the ridge.
   for ring in [p.exterior,*p.interiors]:
    for (ax,az),(bx,bz) in zip(ring.coords,list(ring.coords)[1:]):
     da=ax*nx+az*nz-mid;db=bx*nx+bz*nz-mid
     cuts=[(ax,az)]
     if da*db<0:
      t=da/(da-db);cuts.append((ax+(bx-ax)*t,az+(bz-az)*t))
     cuts.append((bx,bz))
     for (px,pz),(qx,qz) in zip(cuts,cuts[1:]):
      a=[px,top,pz];b=[qx,top,qz];c=[qx,roofheight(qx,qz),qz];dd=[px,roofheight(px,pz),pz]
      for v in [a,b,c,a,c,dd]:walls.extend(round(i,3)for i in v)
   sections=split(p,LineString([(cx-ux*1000,cz-uz*1000),(cx+ux*1000,cz+uz*1000)])) if rise and roof!='flat' else p
   roofs=[]
   for section in polygons(sections):roofs.extend(triangle_positions(section,roofheight,max_edge=1000))
   buildings.append({'id':bid,'name':tags.get('name',''),'type':btype,'polygon':ringslocal,'sourceCoordinates':mapping(llpart)['coordinates'],'height':round(wall,3),'roofHeight':round(rise,3),'roofShape':roof,'roofMethod':'footprint-clipped gable approximation'if roof!='flat'else'flat cap','heightSource':kind,'roofEstimated':not bool(tags.get('roof:shape')and tags.get('roof:height')),'baseElevation':round(foundation,3),'wallPositions':walls,'roofPositions':roofs})
   geo.append({'type':'Feature','id':bid,'properties':{**tags,'featureRole':'building-footprint'},'geometry':mapping(llpart)})
 route=[]
 for a,b in zip(route_local,route_local[1:]):
  n=math.ceil(math.dist(a,b)/3)
  route.extend([[round(a[0]+(b[0]-a[0])*j/n,3),round(a[1]+(b[1]-a[1])*j/n,3)]for j in range(n)])
 route.append(route[0])
 sources=['data/peterborough-osm.json','data/osm-public-roads.geojson','data/terrain/peterborough-dtm-2025.json','data/terrain/peterborough-dtm-2025-terrarium.png']
 data={'schemaVersion':1,'title':'New Romaine Â· block test area','sourceCommit':SOURCE_COMMIT,'dataLicense':'ODbL-1.0','origin':{'lat':lat0,'lon':lon0},'projection':{'radius':R,'x':'east','z':'south','y':'up','unit':'metre','scaleX':scaleX,'scaleZ':scaleZ},'bounds':{'xMin':xmin,'xMax':xmax,'zMin':zmin,'zMax':zmax},'vertical':{'originElevation':base,'datum':'CGVD2013','source':'Ontario DTM 2025; approximately 8.3 m source grid'},'aoi':{'perimeterLonLat':route_ll,'contextBufferMetres':45,'polygon':rings(area),'cornersLonLat':corners},'terrain':terrain,'roads':road_records,'roadPositions':road_positions,'buildings':buildings,'route':{'points':route,'lengthMetres':round(LineString(route_local).length,2),'legs':legs},'anchors':sorted(anchors,key=lambda a:a['name'])}
 (out/'block.json.gz').write_bytes(gzip.compress((json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n').encode('utf-8'),compresslevel=9,mtime=0));write(out/'map-extract.geojson',{'type':'FeatureCollection','name':'New Romaine block - OSM extract','license':'ODbL-1.0','attribution':'Â© OpenStreetMap contributors','features':geo})
 write(out/'provenance.json',{'sourceRepository':'https://github.com/edmondsonedits/Peterborough-Map-Game','sourceCommit':SOURCE_COMMIT,'snapshotHashes':{s:hashlib.sha256((src/s).read_bytes()).hexdigest()for s in sources},'selection':'Fordâ€“Brownâ€“Highâ€“St. Mary\u2019s source centerline loop, including New Romaine, Duffus and Grady, plus 45 m context. Whole intersecting building footprints retained.','transforms':['Local equirectangular east/south/up; no rotation, square forcing or nonuniform alignment.','Road polygons: buffered OSM centerlines, estimated widths from lanes; not municipal pavement polygons.','Source footprint polygons preserved; wall and roof positions approximate; gabled roof style substituted for unhandled pitched styles.','Ontario Terrarium pixel-center bilinear decode in Web Mercator, resampled to <=6 m local grid; source remains ~8.3 m. Road meshes split at matching terrain triangles with 6 cm visual clearance.','Vertical origin subtracted uniformly; no scale or terrain flattening.'],'counts':{'buildings':len(buildings),'roadSegments':len(road_records),'estimatedBuildingHeights':sum(b['heightSource']=='estimated'for b in buildings)},'licenses':[{'code':'Block viewer and adapted facade planner','license':'GPL-2.0-only','notice':'LICENSE.txt','source':'Peterborough-Map-Game city-explorer/building-archetypes.js at '+SOURCE_COMMIT},{'data':'Map geometry','license':'ODbL-1.0','url':'https://www.openstreetmap.org/copyright'},{'data':'Ontario DTM','license':'Open Government Licence â€“ Ontario','url':'https://www.ontario.ca/page/open-government-licence-ontario'},{'code':'Three.js r180','license':'MIT','notice':'../street-alternatives-v1/vendor/THREE-LICENSE.txt'}],'limitations':['Geographic test scaffold, not a reconstruction from video.','Heights, pitched roofs, facade details and road widths mostly estimated. No surveyed-accuracy claim.','No automatic alignment to source camera poses or Gaussian scene coordinates.','The screenshot identifies the requested neighborhood, not a verified exact footage trajectory.','Municipal layers, Google imagery and raw footage are not redistributed.']})
 print(json.dumps({'buildings':len(buildings),'roads':len(road_records),'routeMetres':data['route']['lengthMetres'],'bounds':data['bounds'],'terrainRelativeRange':[min(terrain['heights']),max(terrain['heights'])],'blockBytes':(out/'block.json.gz').stat().st_size,'estimatedHeights':sum(b['heightSource']=='estimated'for b in buildings)}))
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--source-dir',type=Path,required=True);parser.add_argument('--out-dir',type=Path,default=Path(__file__).resolve().parents[1]/'site/demos/new-romaine-block-v1');args=parser.parse_args();build(args.source_dir,args.out_dir)
