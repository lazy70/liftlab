import unittest
import math
from models import Well, natural, gas_lift, esp, esp_head, rod, simulate
class Models(unittest.TestCase):
 def test_zero_gas(self):
  w=Well();self.assertAlmostEqual(natural(w),gas_lift(w,0)['rate'])
 def test_analytic_natural(self):
  w=Well(friction=0);self.assertAlmostEqual(natural(w),max(0,w.pi*(w.reservoir_mpa-w.outflow(0))))
 def test_esp_balance(self):
  w=Well();r=esp(w);self.assertFalse(r['limited']);self.assertAlmostEqual(w.inflow(r['rate']),w.outflow(r['rate'])-w.density*9.80665*r['head']/1e6)
 def test_affinity(self):
  self.assertAlmostEqual(esp_head(240,60),esp_head(200,50)*1.2**2)
 def test_displacement(self):
  self.assertAlmostEqual(rod(Well(),40,2,5,.8)['rate'],math.pi*.04**2/4*2*5*1440*.8)
 def test_supply(self):
  r=rod(Well(reservoir_mpa=2,pi=1));self.assertEqual(r['rate'],1);self.assertTrue(r['limited'])
 def test_no_flow(self):
  w=Well(reservoir_mpa=.5,whp_mpa=2)
  self.assertEqual(natural(w),0);self.assertEqual(rod(w)['rate'],0);self.assertEqual(esp(w,stages=1)['rate'],0)
 def test_runout(self):
  r=esp(Well(reservoir_mpa=100,pi=500,friction=0));self.assertTrue(r['limited']);self.assertEqual(r['rate'],400)
 def test_invalid(self):
  for v in [-1,float('nan'),float('inf')]:
   with self.assertRaises(ValueError): Well(pi=v)
   with self.assertRaises(ValueError): gas_lift(Well(),v)
  with self.assertRaises(ValueError): rod(Well(),fillage=1.2)
  with self.assertRaises(ValueError): esp(Well(),frequency=0)
 def test_sweeps(self):
  for p in [1,16,40]:
   for points in simulate({'well':{'reservoir_mpa':p}})['curves'].values():
    for _,q in points:
     self.assertTrue(math.isfinite(q));self.assertGreaterEqual(q,0);self.assertLessEqual(q,p*35)
if __name__=='__main__':unittest.main()
