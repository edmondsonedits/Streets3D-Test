from pathlib import Path
import re,json,unittest
ROOT=Path(__file__).resolve().parents[1]/'site/demos/hybrid-fire-drive-v1'
class Contracts(unittest.TestCase):
 def test_dom_contract(self):
  app=(ROOT/'app.js').read_text(encoding='utf-8-sig');html=(ROOT/'index.html').read_text(encoding='utf-8-sig')
  ids=re.findall(r'id="([^"]+)"',html)
  self.assertEqual(len(ids),len(set(ids)))
  refs=set(re.findall(r"\$\('([^']+)'\)",app))
  self.assertEqual(refs-set(ids),set(),'App references missing DOM controls')
 def test_utf8_and_failure_label(self):
  app=(ROOT/'app.js').read_text(encoding='utf-8')
  self.assertNotIn('\u00c2',app)
  self.assertNotIn('\u00e2\u20ac',app)
  self.assertIn("$('modelStatus').textContent=truck.status",app)
 def test_spark_import_map(self):
  html=(ROOT/'index.html').read_text(encoding='utf-8')
  imports=json.loads(re.search(r'<script type="importmap">(.*?)</script>',html,re.S).group(1))['imports']
  self.assertIn('three/addons/',imports)
  self.assertTrue((ROOT/imports['three/addons/']/'postprocessing/Pass.js').resolve().exists())
 def test_preview_not_misrepresented(self):
  d=json.loads((ROOT/'route-suggestion.json').read_text())
  self.assertFalse(d['checksPass']);self.assertEqual(d['pairs'],[])
  self.assertGreater(d['routeFitRmsMetres'],3)
  self.assertIn('unverified',d['registrationStatus'])
if __name__=='__main__':unittest.main()
