# LiftLab — Artificial Lift Simulator

An educational petroleum engineering project comparing **gas lift**, **ESPs**, and **sucker-rod pumps** using a simplified common well model.

## Run

Requires Python 3.10+. No third-party packages, API keys or internet needed.

```bash
python server.py
```

Open http://127.0.0.1:8000 in your browser. Windows users can use `py server.py`. Use `--port 8080` for a different port. Stop with Ctrl+C.

## Features

- Adjustable reservoir pressure, depth, density, wellhead pressure, PI and friction.
- Gas injection, ESP frequency/stages and rod plunger/stroke/speed/fillage controls.
- Liquid-rate comparison with natural-flow baseline.
- Sensitivity plots, pump head/power estimates and differential fluid load.
- Reservoir supply and pump runout indicators.
- CSV export of simulated inputs, rates and sweeps.
- Equations and learning exercises in the dashboard.

## Engineering assumptions

All calculations use SI units. Q is m³/day at model fluid conditions with formation volume factor assumed 1. A vertical well, constant liquid density and steady flow are assumed. Pump/injection depth equals reservoir depth. Pressure values share one reference basis; pressure differences govern the model.

**Inflow:** `Pwf = Pr - Q/PI` (MPa). Linear PI, not Vogel.

**Outflow:** `Pwh + rho*g*D/1e6 + k*Q²` (MPa). The user-specified lumped friction coefficient k has units MPa/(m³/day)². This is not a multiphase tubing correlation. A monotonic pressure balance is solved by bisection.

**Gas lift:** illustrative gas fraction `alpha = 0.65*I/(I+10000)`, effective density `rho*(1-alpha)`, and added injection-friction pressure `2e-9*I²` MPa, for I in standard m³/day. These are invented teaching parameters, not validated correlations. Gas expansion, slip, injection pressure, valve design and compressor power are excluded.

**ESP:** generic reference stage has 12 m shutoff head and 400 m³/day runout at 50 Hz. `H = stages*12*((frequency/50)²-(Q/400)²)` within the positive-head curve. Speed scaling follows affinity principles; the reference curve is illustrative, not manufacturer data. The solver matches inflow with tubing outflow minus pump boost. At runout, the output is explicitly a curve bound rather than a valid matched operating point. Input power is `rho*g*(Q/86400)*H/0.65/1000` kW using assumed constant overall efficiency. Gas handling, cavitation, viscosity, motor limits and cable losses are excluded.

**Rod pump:** displacement `pi*d²/4 * downhole_stroke * SPM * 1440`, multiplied by specified fillage/volumetric efficiency and capped by reservoir supply at assumed 1 MPa minimum intake pressure. Diameter is converted from mm to m. Hydraulic boost is `max(0,Pout-Pwf)`; estimated input power divides hydraulic power by 0.65. Fluid load equals differential pressure times plunger area. This is NOT peak polished-rod load. Rod weight, stretch, inertia, friction, motor ratings and dynamometer cards are not modeled. Zero hydraulic boost gives zero modeled power although real equipment still consumes power. Sufficient unspecified equipment capacity is assumed.

**Use for education, not field design.** Rate alone does not establish the best lift method. Equipment envelopes, gas availability, fluid properties, reliability and economics require separate evaluation.

## Experiments

1. Compare gas injection at 0, 10,000 and 40,000 standard m³/day.
2. Change ESP frequency from 40 to 60 Hz and explain the system response.
3. Lower reservoir pressure and increase rod speed to observe supply limitation.
4. Change PI and depth independently and compare the three methods.

## Tests and structure

```bash
python -m unittest discover -s tests -v
```

`models.py` contains calculations; `server.py` serves a loopback-only local app; `index.html` contains the responsive dashboard, SVG plots and CSV export. `tests/` checks numerical balances, analytical results, physical bounds and invalid inputs. GitHub Actions runs the tests on push and pull request.

## Upload to GitHub

Create an empty repository named `liftlab`, then run from this folder:

```bash
git init -b main
git add .
git commit -m "Build LiftLab artificial lift simulator"
git remote add origin https://github.com/lazy70/liftlab.git
git push -u origin main
```

Alternatively use GitHub's Add file → Upload files with the extracted files. Include `.github/workflows/tests.yml` for CI. The URL is a proposed destination, not confirmation that the repository exists. GitHub Pages alone cannot run the Python backend; run locally or use a Python-capable host. The local server is for personal use, not hardened public deployment.

## References

- [SLB: Artificial Lift](https://www.slb.com/resource-library/oilfield-review/defining-series/defining-artificial-lift)
- [SLB: Gas Lift](https://www.slb.com/resource-library/oilfield-review/defining-series/defining-gas-lift)
- [SLB: ESP](https://www.slb.com/resource-library/oilfield-review/defining-series/defining-esp)
- [SLB: Rod Pumps](https://www.slb.com/resource-library/oilfield-review/defining-series/defining-rod-pumps)
- [KSB: Pump Affinity Laws](https://www.ksb.com/en-global/centrifugal-pump-lexicon/article/pump-affinity-laws-1117584)

References explain operating principles; they do not validate this project's coefficients or generic pump curve.
