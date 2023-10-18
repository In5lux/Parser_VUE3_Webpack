export const isChrome = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes('chrome') ||
    userAgent.includes('chromium')
  );
}