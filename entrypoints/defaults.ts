import { DEFAULT_OPTIONS } from '../lib/defaults';

export default defineUnlistedScript(() => {
  Object.assign(globalThis, { twOpenOriginalImage_defaults: DEFAULT_OPTIONS });
});
