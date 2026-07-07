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
  const fragment = document.createDocumentFragment();
  block.classList.add('index-marketing', 'index-marketing--steps-only');
  if (parsed.steps) {
    mountStepsSection(fragment, parsed.steps, {
      standalone: true,
      skipHead: hasAuthoredSectionIntro(block),
    });
  }
  block.replaceChildren(...fragment.children);
}

function decorateStoriesOnly(block) {
  const parsed = parseIndexMarketingBlock(block);
  const fragment = document.createDocumentFragment();
  block.classList.add('index-marketing', 'index-marketing--stories-only');
  if (parsed.stories) {
    mountStoriesSection(fragment, parsed.stories, {
      standalone: true,
      skipHead: hasAuthoredSectionIntro(block),
    });
  }
  block.replaceChildren(...fragment.children);
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
  const fragment = document.createDocumentFragment();
  block.classList.add('index-marketing');

  if (parsed.steps) {
    mountStepsSection(fragment, parsed.steps);
  }
  if (parsed.stories) {
    mountStoriesSection(fragment, parsed.stories);
  }
  block.replaceChildren(...fragment.children);
}
