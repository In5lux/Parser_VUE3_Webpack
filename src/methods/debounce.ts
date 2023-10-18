interface IDebounce{
	<Args extends any[], F extends (...args: Args) => any>(fn: F, ms: number): {
  (this: ThisParameterType<F>, ...args: Args): void
	}
}

export const debounce: IDebounce = (fn: Function, ms: number) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (this, ...args: any[]) {
    clearTimeout(timeoutId);		
    timeoutId = setTimeout(() => fn(this, args), ms);
  };
};