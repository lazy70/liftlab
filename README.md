# LiftLab — Artificial Lift, Machine Learning and Data Science

An educational petroleum engineering project comparing **gas lift**, **ESPs**, and **sucker-rod pumps** using a simplified common well model.


## Version 2: ML / Data Lab and Lift Advisor

Open **[the live ML Lab](https://productionliftlab.netlify.app/lab.html)**, or open `lab.html` locally in a browser. The original simulator links to it.

1. Click **Load synthetic demo**, or upload your own CSV and declare its provenance.
2. Select a method and inspect data quality, feature summaries and correlations.
3. Click **Train selected method** to fit ridge regression and evaluate on held-out wells.
4. Review MAE, RMSE, R², baseline performance, residual plots and learned coefficients.
5. Enter a scenario and infrastructure constraints. Compare the physics estimate with the trained ML estimate.
6. Ask the **Lift Advisor** why the selected method might be unsuitable or which checks are needed.

The model learns rate predictions from data. The advisor is an explainable **rule-based bot**, not an LLM or trained method-selection model. Synthetic demo labels come from the teaching equations and do not prove field accuracy. See [ML_MODEL_CARD.md](ML_MODEL_CARD.md) for the full data contract, algorithm and limitations.

CSV template headers:

```csv
well_id,method,reservoir_mpa,depth_m,density,whp_mpa,pi,friction,injection,frequency,stages,diameter,stroke,spm,fillage,liquid_rate
```

Equipment fields irrelevant to a row's method can be blank. At least 30 valid records and 5 wells per method are required. Use the same anonymized well ID across repeated observations. Units and accepted ranges are displayed in the Lab. Training, upload parsing and conversation run locally without an API key. The app does not upload CSV contents. Reloading clears the in-memory data/models.

New files: `engine.js` (shared physics), `ml.js` (regression/data checks), `advisor.js` (rules), `lab.html`, `lab.css`, `lab.js` (interface), and `tests/test_ml.js`.

Run both test suites from the repository root:

```bash
python -m unittest discover -s tests -v
node tests/test_ml.js
```

Node.js is needed only for JavaScript tests. The deployed site needs no build command and publish directory remains `.`.

## Deploy on Netlify

The dashboard now runs all calculations in the browser; no Python backend is required for the website.

- Branch: `main`
- Base directory: leave blank
- Build command: leave blank
- Publish directory: `.`
- Environment variables: none

The browser engine was compared against the Python model across six scenarios, including no flow, runout and supply limitation; all outputs and sweep points matched within numerical tolerance. Python remains available as a reference implementation.

You can also open `index.html` directly in a modern browser.

## Run the optional Python server

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

Alternatively use GitHub's Add file → Upload files with the extracted files. Include `.github/workflows/tests.yml` for CI. The URL is a proposed destination, not confirmation that the repository exists. The standalone dashboard also works on GitHub Pages. The optional Python backend requires a Python-capable host. The local server is for personal use, not hardened public deployment.

## References

- [SLB: Artificial Lift](https://www.slb.com/resource-library/oilfield-review/defining-series/defining-artificial-lift)
- [SLB: Gas Lift](https://www.slb.com/resource-library/oilfield-review/defining-series/defining-gas-lift)
- [SLB: ESP](https://www.slb.com/resource-library/oilfield-review/defining-series/defining-esp)
- [SLB: Rod Pumps](https://www.slb.com/resource-library/oilfield-review/defining-series/defining-rod-pumps)
- [KSB: Pump Affinity Laws](https://www.ksb.com/en-global/centrifugal-pump-lexicon/article/pump-affinity-laws-1117584)

References explain operating principles; they do not validate this project's coefficients or generic pump curve.
