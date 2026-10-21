import unittest,json,math,gzip
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class BlockTests(unittest.TestCase):
 def test_geographic_extract(self):
  p=ROOT/'site/demos/new-romaine-block-v1/block.json.gz'
  self.assertTrue(p.exists(),'New location extract must exist')
  d=json.loads(gzip.decompress(p.read_bytes()).decode('utf-8'))
  names={r['name'] for r in d['roads']}
  self.assertTrue({'Ford Street','Brown Street','High Street',"St. Mary's Street",'New Romaine Street','Duffus Street','Grady Avenue'}<=names)
  self.assertGreater(len(d['buildings']),50)
  self.assertLess(len(d['buildings']),400)
  self.assertEqual(d['route']['points'][0],d['route']['points'][-1])
  pts=d['route']['points']
  self.assertTrue(all(math.dist(a,b)<=4.1 for a,b in zip(pts,pts[1:])))
  self.assertGreater(d['route']['lengthMetres'],900)
  self.assertLess(d['route']['lengthMetres'],1600)
  self.assertEqual(len(d['terrain']['heights']),d['terrain']['cols']*d['terrain']['rows'])
  for b in d['buildings']:
   self.assertEqual(b['polygon'][0][0],b['polygon'][0][-1])
   self.assertEqual(len(b['sourceCoordinates'][0]),len(b['polygon'][0]))
   self.assertTrue(b['heightSource'] in ['osm-height','osm-levels','estimated'])
   self.assertTrue(2.5 <= b['height'] <= 120)
   self.assertTrue(all(math.isfinite(x) for x in b['wallPositions']+b['roofPositions']))
   self.assertEqual(len(b['wallPositions'])%9,0)
   self.assertEqual(len(b['roofPositions'])%9,0)
  self.assertEqual(d['sourceCommit'],'3754f99a0e59cd97b35d5e64ac31ac26c6bbbde8')
  self.assertEqual(d['dataLicense'],'ODbL-1.0')
  self.assertTrue(all(r['widthEstimated'] for r in d['roads']))

 def test_projection_roofs_and_road_clearance(self):
  d=json.loads(gzip.decompress((ROOT/'site/demos/new-romaine-block-v1/block.json.gz').read_bytes()))
  o=d['origin'];sx=d['projection']['scaleX'];sz=d['projection']['scaleZ'];t=d['terrain']
  def segment_distance(p,a,b):
   dx=b[0]-a[0];dz=b[1]-a[1];den=dx*dx+dz*dz
   f=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/den))if den else 0
   return math.dist(p,[a[0]+f*dx,a[1]+f*dz])
  def inside(p,ring):
   if any(segment_distance(p,a,b)<.002 for a,b in zip(ring,ring[1:])):return True
   cross=0
   for a,b in zip(ring,ring[1:]):
    if (a[1]>p[1])!=(b[1]>p[1]) and p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]:cross+=1
   return cross%2==1
  for b in d['buildings']:
   for ring,ll in zip(b['polygon'],b['sourceCoordinates']):
    for (x,z),(lon,lat) in zip(ring,ll):self.assertLess(math.dist([x,z],[(lon-o['lon'])*sx,(o['lat']-lat)*sz]),.001)
   v=b['roofPositions']
   for i in range(0,len(v),3):self.assertTrue(inside([v[i],v[i+2]],b['polygon'][0]),b['id'])
  def h(x,z):
   gx=(x-t['xMin'])/(t['xMax']-t['xMin'])*(t['cols']-1);gz=(z-t['zMin'])/(t['zMax']-t['zMin'])*(t['rows']-1)
   ix=max(0,min(t['cols']-2,math.floor(gx)));iz=max(0,min(t['rows']-2,math.floor(gz)));a=gx-ix;b=gz-iz
   get=lambda col,row:t['heights'][row*t['cols']+col]
   return get(ix,iz)+a*(get(ix+1,iz)-get(ix,iz))+b*(get(ix,iz+1)-get(ix,iz)) if a+b<=1 else get(ix+1,iz+1)+(1-a)*(get(ix,iz+1)-get(ix+1,iz+1))+(1-b)*(get(ix+1,iz)-get(ix+1,iz+1))
  road=d['roadPositions']
  for i in range(0,len(road),9):
   vertices=[road[i+j:i+j+3] for j in [0,3,6]]
   for v in [*vertices,[sum(v[k]for v in vertices)/3 for k in range(3)]]:
    self.assertAlmostEqual(v[1]-h(v[0],v[2]),.06,delta=.003)

if __name__=='__main__': unittest.main()
