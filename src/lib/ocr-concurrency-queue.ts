/** Limits parallel async OCR work (browser + API). */
export class OcrConcurrencyQueue {
  private running = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {}

  run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const execute = () => {
        this.running += 1;
        task()
          .then(resolve, reject)
          .finally(() => {
            this.running -= 1;
            const next = this.waiters.shift();
            if (next) {
              next();
            }
          });
      };

      if (this.running < this.maxConcurrent) {
        execute();
      } else {
        this.waiters.push(execute);
      }
    });
  }
}
