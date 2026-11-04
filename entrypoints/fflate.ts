import { strToU8, zipSync } from 'fflate';

export default defineUnlistedScript(() => {
  Object.assign(globalThis, { fflate: { strToU8, zipSync } });
});
