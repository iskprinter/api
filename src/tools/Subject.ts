type Observer<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  next: (data: T) => Promise<any> | any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error?: (error: any) => Promise<any> | any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  complete?: () => Promise<any> | any
}

export default class Subject<T> {

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(public notify: (observer: Observer<T>) => Promise<any>) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async subscribe(observer: Observer<T>): Promise<any> {
    if (!observer.error) {
      observer.error = (err) => { throw err };
    }
    if (!observer.complete) {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      observer.complete = () => {};
    }
    return this.notify(observer);
  }
}
