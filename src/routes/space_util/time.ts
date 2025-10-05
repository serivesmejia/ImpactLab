const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

export type TimeMode = 'sim' | 'real';

export class TimeController {
  private mode: TimeMode;
  private rateDaysPerSec: number;
  private simDays: number;

  constructor() {
    this.mode = 'sim';
    this.rateDaysPerSec = 365;
    this.simDays = 0;
  }

  setMode(m: TimeMode): void {
    this.mode = m;
  }

  setRate(r: number): void {
    this.rateDaysPerSec = r;
  }

  setSimDays(d: number): void {
    this.simDays = d;
  }

  tick(dt: number): void {
    if (this.mode === 'sim') {
      this.simDays += this.rateDaysPerSec * dt;
    }
  }

  get days(): number {
    if (this.mode === 'real') {
      return (Date.now() - J2000) / (1000 * 86400);
    } else {
      return this.simDays;
    }
  }
}
