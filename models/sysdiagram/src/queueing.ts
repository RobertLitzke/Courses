// The arithmetic of queues, for the figures that show waiting grow with load.
// Requests arriving at random (Poisson) to c servers with random (exponential)
// service times: M/M/1 and M/M/c. Times in the units of `service`.

/** Utilisation: arrivals a second times seconds of work each, over c servers. */
export const utilisation = (rate: number, serviceSec: number, c = 1) => (rate * serviceSec) / c;

/** Mean time in an M/M/1 system (waiting plus service): S / (1 − ρ). Infinite at ρ ≥ 1. */
export function mm1Time(rho: number, service: number): number {
  return rho >= 1 ? Infinity : service / (1 - rho);
}

/** The pth quantile of time in an M/M/1 system: the time is exponential with mean S / (1 − ρ). */
export function mm1Quantile(rho: number, service: number, p: number): number {
  return rho >= 1 ? Infinity : -Math.log(1 - p) * mm1Time(rho, service);
}

/** Erlang's C formula: the chance an arrival must wait, with c servers at offered load a = λS (in erlangs). */
export function erlangC(c: number, a: number): number {
  if (a >= c) return 1;
  let term = 1;
  let sum = 1;
  for (let k = 1; k < c; k++) {
    term *= a / k;
    sum += term;
  }
  const last = (term * a) / c / (1 - a / c);
  return last / (sum + last);
}

/** Mean time in an M/M/c system: S plus the mean wait, C(c, a) · S / (c − a). */
export function mmcTime(c: number, a: number, service: number): number {
  if (a >= c) return Infinity;
  return service + (erlangC(c, a) * service) / (c - a);
}

/** Little's law: requests in the system = arrival rate × time each spends in it. */
export const little = (rate: number, time: number) => rate * time;

/** The chance at least one of n parallel calls is slower than a quantile q of one call: 1 − qⁿ. */
export const tailFanout = (n: number, q = 0.99) => 1 - Math.pow(q, n);
