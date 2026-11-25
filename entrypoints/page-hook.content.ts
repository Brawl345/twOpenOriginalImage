import { installGraphqlHook } from '../lib/graphql-hook';

export default defineContentScript({
  matches: ['https://x.com/*'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    installGraphqlHook(window);
  },
});
