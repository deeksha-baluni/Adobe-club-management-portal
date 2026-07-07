/**
 * Event Hero — legacy da.live block name for `/event` pages.
 */
import { decorateEventHeroBlock } from '../page-hero/page-hero.js';

export default async function decorate(block) {
  await decorateEventHeroBlock(block);
}
