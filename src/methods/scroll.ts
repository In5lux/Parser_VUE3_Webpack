import { isChrome } from './checkBrowser';

const body: HTMLBodyElement | null = document.querySelector('body');
const chrome = isChrome();

const { hideScroll, setScroll } = (() => {
  if (chrome) {
    return {
      hideScroll: () => {
        body?.classList.add('body-p-right');
        body?.classList.add('hide_scroll');
      },
      setScroll: () => {
        body?.classList.remove('body-p-right');
        body?.classList.remove('hide_scroll'); 
      }
    }
  } else {
    return {
      hideScroll: () => {        
        body?.classList.add('hide_scroll');
      },
      setScroll: () => {        
        body?.classList.remove('hide_scroll'); 
      }
    }
  }
})();

export { hideScroll, setScroll }
