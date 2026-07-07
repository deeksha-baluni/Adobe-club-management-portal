/**
 * Index Marketing — steps + member stories (index only).
 * da.live: section | steps | stories + key | value rows (see docs in repo).
 * Legacy `.steps` / `.cards` class names are migrated here before block load.
 */
import { parseIndexMarketingBlock } from './parse.js';
import { mountStepsSection } from './steps.js';
import { mountStoriesSection } from './stories.js';
import { hasAuthoredSectionIntro } from '../club-shared/section-intro.js';

function decorateStepsOnly(block) {
  const parsed = parseIndexMarketingBlock(block);
  block.textContent = '';
  block.classList.add('index-marketing', 'index-marketing--steps-only');
  if (parsed.steps) {
    mountStepsSection(block, parsed.steps, {
      standalone: true,
      skipHead: hasAuthoredSectionIntro(block),
    });
  }
}

function decorateStoriesOnly(block) {
  const parsed = parseIndexMarketingBlock(block);
  block.textContent = '';
  block.classList.add('index-marketing', 'index-marketing--stories-only');
  if (parsed.stories) {
    mountStoriesSection(block, parsed.stories, {
      standalone: true,
      skipHead: hasAuthoredSectionIntro(block),
    });
  }
}

export default function decorate(block) {
  if (block.classList.contains('index-marketing--steps-only')) {
    decorateStepsOnly(block);
    return;
  }
  if (block.classList.contains('index-marketing--stories-only')) {
    decorateStoriesOnly(block);
    return;
  }

  const parsed = parseIndexMarketingBlock(block);

  block.textContent = '';
  block.classList.add('index-marketing');

  if (parsed.steps) {
    mountStepsSection(block, parsed.steps);
  }
  if (parsed.stories) {
    mountStoriesSection(block, parsed.stories);
  }
}
