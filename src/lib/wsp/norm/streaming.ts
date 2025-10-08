// Streaming normalization utilities: Welford (mean/std) and P² quantile estimator
// Reference: Welford's online algorithm; Jain & Chlamtac (1985) P² algorithm

export type WelfordState = { mean: number; m2: number; count: number };

export function updateWelford(prev: WelfordState | null | undefined, x: number): WelfordState {
  const mean0 = prev?.mean ?? 0;
  const m20 = prev?.m2 ?? 0;
  const count0 = prev?.count ?? 0;
  const count = count0 + 1;
  const delta = x - mean0;
  const mean = mean0 + delta / count;
  const delta2 = x - mean;
  const m2 = m20 + delta * delta2;
  return { mean, m2, count };
}

export function stdFromWelford(state: WelfordState): number {
  if (!state || state.count < 2) return 0;
  return Math.sqrt(state.m2 / (state.count - 1));
}

export function rollZ(x: number, state: WelfordState | null | undefined): { z: number; mean: number; std: number } {
  const mean = state?.mean ?? 0;
  const std = stdFromWelford(state as WelfordState);
  const z = std > 0 ? (x - mean) / std : 0;
  return { z, mean, std };
}

// P² quantile estimator implementation for a single quantile p
export type P2Snapshot = {
  p: number;
  n: number[]; // marker positions
  q: number[]; // marker heights (estimates)
  np: number[]; // desired positions
  dn: number[]; // desired position increments
  initialized: boolean;
  count: number;
  initial: number[]; // buffer until first 5 samples
};

export class P2Quantile {
  private p: number;
  private n: number[] = [1, 2, 3, 4, 5];
  private q: number[] = [0, 0, 0, 0, 0];
  private np: number[] = [0, 0, 0, 0, 0];
  private dn: number[] = [0, 0, 0, 0, 0];
  private initialized = false;
  private count = 0;
  private initial: number[] = [];

  constructor(p: number, snapshot?: P2Snapshot) {
    if (p <= 0 || p >= 1) throw new Error('p must be in (0,1)');
    this.p = p;
    if (snapshot) this.fromSnapshot(snapshot);
  }

  private initFromFive(values: number[]) {
    const v = [...values].sort((a, b) => a - b);
    this.q = [v[0], v[1], v[2], v[3], v[4]];
    this.n = [1, 2, 3, 4, 5];
    this.np = [1, 1 + 2 * this.p, 1 + 4 * this.p, 3 + 2 * this.p, 5];
    this.dn = [0, this.p / 2, this.p, (1 + this.p) / 2, 1];
    this.initialized = true;
  }

  update(x: number) {
    this.count += 1;
    if (!this.initialized) {
      this.initial.push(x);
      if (this.initial.length === 5) {
        this.initFromFive(this.initial);
        this.initial = [];
      }
      return;
    }

    // Step 1: Find cell k
    let k: number;
    if (x < this.q[0]) {
      this.q[0] = x;
      k = 0;
    } else if (x >= this.q[4]) {
      this.q[4] = x;
      k = 3;
    } else {
      k = 0;
      while (k < 4 && x >= this.q[k + 1]) k++;
      // k in [0,3] such that q[k] <= x < q[k+1]
    }

    // Step 2: Increment positions of markers k+1..4
    for (let i = k + 1; i < 5; i++) this.n[i] += 1;

    // Step 3: Desired positions
    for (let i = 0; i < 5; i++) this.np[i] += this.dn[i];

    // Step 4: Adjust heights of markers 2..4 (index 1..3)
    for (let i = 1; i <= 3; i++) {
      const d = this.np[i] - this.n[i];
      if ((d >= 1 && this.n[i + 1] - this.n[i] > 1) || (d <= -1 && this.n[i - 1] - this.n[i] < -1)) {
        const di = Math.sign(d);
        // Parabolic prediction
        const qPrev = this.q[i - 1], qCurr = this.q[i], qNext = this.q[i + 1];
        const nPrev = this.n[i - 1], nCurr = this.n[i], nNext = this.n[i + 1];
        const a = (di * (nCurr - nPrev + di) * (qNext - qCurr)) / (nNext - nCurr)
                + (di * (nNext - nCurr - di) * (qCurr - qPrev)) / (nCurr - nPrev);
        let qNew = qCurr + a / (nNext - nPrev);
        // If qNew is not between neighbors, use linear update
        if (qNew <= qPrev || qNew >= qNext) {
          qNew = qCurr + di * (this.q[i + di] - qCurr) / (this.n[i + di] - nCurr);
        }
        this.q[i] = qNew;
        this.n[i] += di;
      }
    }
  }

  estimate(): number | null {
    if (!this.initialized) return this.initial.length ? this.initial.sort((a, b) => a - b)[Math.floor(this.initial.length * this.p)] : null;
    return this.q[2]; // median marker approximates the quantile estimate positionally
  }

  toSnapshot(): P2Snapshot {
    return { p: this.p, n: [...this.n], q: [...this.q], np: [...this.np], dn: [...this.dn], initialized: this.initialized, count: this.count, initial: [...this.initial] };
  }

  fromSnapshot(s: P2Snapshot) {
    this.p = s.p;
    this.n = [...s.n];
    this.q = [...s.q];
    this.np = [...s.np];
    this.dn = [...s.dn];
    this.initialized = s.initialized;
    this.count = s.count;
    this.initial = [...s.initial];
  }
}

export type PctlPair = { p5: P2Snapshot; p95: P2Snapshot };

export function rollPctl(x: number, p5snap?: P2Snapshot | null, p95snap?: P2Snapshot | null): PctlPair {
  const p5 = new P2Quantile(0.05, p5snap || undefined);
  const p95 = new P2Quantile(0.95, p95snap || undefined);
  p5.update(x);
  p95.update(x);
  return { p5: p5.toSnapshot(), p95: p95.toSnapshot() };
}
