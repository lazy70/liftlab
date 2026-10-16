"""LiftLab educational steady-state models. SI inputs and outputs throughout."""
from dataclasses import dataclass
import math

G = 9.80665

@dataclass(frozen=True)
class Well:
    reservoir_mpa: float = 16.0
    depth_m: float = 1800.0
    density: float = 850.0
    whp_mpa: float = 1.0
    pi: float = 35.0  # m3/day/MPa
    friction: float = 0.00002  # MPa/(m3/day)^2, lumped calibration coefficient

    def __post_init__(self):
        for key, value in vars(self).items():
            if not math.isfinite(value) or value < 0:
                raise ValueError(f'{key} must be finite and nonnegative')
        if min(self.reservoir_mpa, self.depth_m, self.density, self.pi) <= 0:
            raise ValueError('Reservoir pressure, depth, density and PI must be positive')

    def inflow(self, q):
        return self.reservoir_mpa - q / self.pi

    def outflow(self, q, density=None):
        return self.whp_mpa + (self.density if density is None else density)*G*self.depth_m/1e6 + self.friction*q*q


def positive(**values):
    for key, value in values.items():
        if not math.isfinite(value) or value <= 0:
            raise ValueError(f'{key} must be finite and positive')


def intersection(well, required, upper=None):
    """Monotonic pressure-balance root; never return negative production."""
    hi = well.pi*well.reservoir_mpa if upper is None else min(upper, well.pi*well.reservoir_mpa)
    if well.inflow(0) <= required(0):
        return 0.0
    if well.inflow(hi) >= required(hi):
        return hi
    lo = 0.0
    for _ in range(80):
        mid = (lo+hi)/2
        if well.inflow(mid) > required(mid):
            lo = mid
        else:
            hi = mid
    return (lo+hi)/2


def natural(w):
    return intersection(w, w.outflow)


def gas_lift(w, injection=10000.0):
    """Illustrative density reduction plus injection friction, not a multiphase correlation."""
    if not math.isfinite(injection) or injection < 0:
        raise ValueError('Injection must be finite and nonnegative')
    alpha = 0.65*injection/(injection+10000.0)
    rho = w.density*(1-alpha)
    penalty = 2e-9*injection**2
    q = intersection(w, lambda q: w.outflow(q, rho)+penalty)
    return dict(rate=q, pwf=w.inflow(q), density=rho, gas_fraction=alpha, penalty=penalty)


def esp_head(q, frequency=50.0, stages=200.0):
    # Illustrative reference stage: 12 m shutoff head, 400 m3/day runout at 50 Hz.
    ratio = frequency/50.0
    return stages*12.0*max(0.0, ratio**2-(q/400.0)**2)


def esp(w, frequency=50.0, stages=200.0, efficiency=0.65):
    positive(frequency=frequency, stages=stages, efficiency=efficiency)
    if efficiency > 1:
        raise ValueError('Efficiency cannot exceed 1')
    head = lambda q: esp_head(q, frequency, stages)
    required = lambda q: w.outflow(q)-w.density*G*head(q)/1e6
    runout = 400*frequency/50
    q = intersection(w, required, runout)
    # Clipping to runout is explicitly reported, not presented as a matched operating point.
    limited = q >= runout*(1-1e-9)
    power = w.density*G*(q/86400)*head(q)/efficiency/1000
    return dict(rate=q, pwf=w.inflow(q), head=head(q), power=power, limited=limited,
                status='Outside pump curve: runout bound' if limited else ('No flowing solution' if q == 0 else 'Pressure balance solved'))


def rod(w, diameter_mm=44.0, stroke_m=2.5, spm=8.0, fillage=0.8, efficiency=0.65):
    positive(diameter_mm=diameter_mm, stroke_m=stroke_m, spm=spm, fillage=fillage, efficiency=efficiency)
    if max(fillage, efficiency) > 1:
        raise ValueError('Fillage and efficiency cannot exceed 1')
    area = math.pi*(diameter_mm/1000)**2/4
    displacement = area*stroke_m*spm*1440
    capacity = displacement*fillage
    # Minimum intake pressure assumed = 1 MPa; pump at reservoir depth.
    supply = max(0.0, w.pi*(w.reservoir_mpa-1.0))
    q = min(capacity, supply)
    boost = max(0.0, w.outflow(q)-w.inflow(q))
    power = boost*1e6*q/86400/efficiency/1000
    return dict(rate=q, pwf=w.inflow(q), displacement=displacement, capacity=capacity,
                power=power, load=boost*1e6*area/1000, limited=capacity> supply,
                boost=boost)


def simulate(data):
    w = Well(**data.get('well', {}))
    p = data.get('settings', {})
    gas = float(p.get('injection', 10000))
    hz = float(p.get('frequency', 50))
    stages = float(p.get('stages', 200))
    spm = float(p.get('spm', 8))
    diameter = float(p.get('diameter', 44))
    stroke = float(p.get('stroke', 2.5))
    fillage = float(p.get('fillage', .8))
    result = {'natural': natural(w), 'gas': gas_lift(w, gas), 'esp': esp(w,hz,stages),
              'rod': rod(w,diameter,stroke,spm,fillage)}
    result['curves'] = {
        'gas': [[i*1000, gas_lift(w,i*1000)['rate']] for i in range(41)],
        'esp': [[i, esp(w,i,stages)['rate']] for i in range(30,71)],
        'rod': [[i/2, rod(w,diameter,stroke,i/2,fillage)['rate']] for i in range(2,31)]}
    result['inputs'] = {'well':vars(w),'settings': dict(injection=gas,frequency=hz,stages=stages,spm=spm,diameter=diameter,stroke=stroke,fillage=fillage)}
    return result
