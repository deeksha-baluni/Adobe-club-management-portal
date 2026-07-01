import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/** Default footer content — matches adobe-clubs when da.live is sparse. */
const DEFAULT_FOOTER = {
  brand: {
    href: '/',
    label: 'Adobe Clubs',
    tagline: 'The front door to clubs, events, and community at Adobe.',
    contactLabel: 'Clubs admin',
    email: 'clubs-admin@adobe.com',
  },
  columns: [
    {
      heading: 'Explore',
      links: [
        { label: 'Home', href: '/' },
        { label: 'Clubs', href: '/clubs' },
        { label: 'Events', href: '/events' },
        { label: 'Resources', href: '/resources' },
      ],
    },
    {
      heading: 'Get started',
      links: [
        { label: 'Sign in', href: '/login' },
        { label: 'Sign up', href: '/login#signup' },
      ],
    },
    {
      heading: 'Contact and Support',
      links: [
        { label: 'Email clubs admin', href: 'mailto:clubs-admin@adobe.com' },
        { label: 'Help & FAQs', href: '/#faq' },
        {
          label: 'Request a new club',
          href: 'mailto:clubs-admin@adobe.com?subject=New%20club%20proposal',
        },
      ],
    },
  ],
  copyright: '© 2025 Adobe Inc.',
};

/**
 * Unwraps DA list markup (li > p > a) to li > a.
 * @param {HTMLUListElement} list
 */
function unwrapListLinks(list) {
  list.querySelectorAll('li').forEach((li) => {
    const paragraph = li.querySelector(':scope > p');
    const link = paragraph?.querySelector('a[href]');
    if (
      paragraph
      && link
      && paragraph.children.length === 1
      && paragraph.textContent.trim() === link.textContent.trim()
    ) {
      li.replaceChildren(link);
    }
  });
}

/**
 * Builds the footer logo link from an authored anchor.
 * @param {HTMLAnchorElement} source
 * @returns {HTMLAnchorElement}
 */
function buildFooterLogo(source) {
  const logo = document.createElement('a');
  logo.className = 'footer-logo';
  logo.href = source.href;
  logo.setAttribute('aria-label', 'Adobe Clubs home');

  const image = source.querySelector('picture, img');
  if (image) {
    const icon = document.createElement('div');
    icon.className = 'footer-adobe-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.append(image.cloneNode(true));

    const suffix = document.createElement('span');
    suffix.className = 'brand-suffix';
    const text = source.textContent.trim();
    suffix.textContent = text.replace(/^Adobe\s*/i, '').trim() || 'Clubs';

    logo.append(icon, suffix);
  } else {
    logo.textContent = source.textContent.trim() || DEFAULT_FOOTER.brand.label;
  }

  return logo;
}

/**
 * Builds brand column from da.live section 1 or defaults.
 * Expected order: brand link, tagline, contact label, contact email.
 * @param {Element|null} section
 * @returns {HTMLElement}
 */
function buildFooterBrand(section) {
  const brand = document.createElement('div');
  brand.className = 'footer-brand';

  const paragraphs = section
    ? [...section.querySelectorAll('.default-content-wrapper > p')]
    : [];

  const brandLink = paragraphs[0]?.querySelector('a[href]:not([href^="mailto:"])');
  if (brandLink) {
    brand.append(buildFooterLogo(brandLink));
  } else {
    const fallbackLogo = document.createElement('a');
    fallbackLogo.className = 'footer-logo';
    fallbackLogo.href = DEFAULT_FOOTER.brand.href;
    fallbackLogo.setAttribute('aria-label', 'Adobe Clubs home');
    fallbackLogo.textContent = DEFAULT_FOOTER.brand.label;
    brand.append(fallbackLogo);
  }

  const tagline = document.createElement('p');
  tagline.className = 'footer-tagline';
  tagline.textContent = paragraphs[1]?.textContent.trim() || DEFAULT_FOOTER.brand.tagline;
  brand.append(tagline);

  const contact = document.createElement('div');
  contact.className = 'footer-contact';

  const contactLabel = document.createElement('p');
  contactLabel.className = 'footer-contact-label';
  contactLabel.textContent = paragraphs[2]?.textContent.trim() || DEFAULT_FOOTER.brand.contactLabel;

  const contactLink = document.createElement('a');
  contactLink.className = 'footer-contact-link';
  const mailAnchor = paragraphs[3]?.querySelector('a[href^="mailto:"]');
  if (mailAnchor) {
    contactLink.href = mailAnchor.href;
    contactLink.textContent = mailAnchor.textContent.trim();
  } else {
    contactLink.href = `mailto:${DEFAULT_FOOTER.brand.email}`;
    contactLink.textContent = DEFAULT_FOOTER.brand.email;
  }

  contact.append(contactLabel, contactLink);
  brand.append(contact);

  return brand;
}

/**
 * Builds one footer link column.
 * @param {string} heading
 * @param {HTMLUListElement|undefined} list
 * @param {{ label: string, href: string }[]} fallbackLinks
 * @returns {HTMLElement}
 */
function buildFooterColumn(heading, list, fallbackLinks) {
  const col = document.createElement('div');
  col.className = 'footer-col';

  const headingEl = document.createElement('h2');
  headingEl.className = 'footer-col-heading';
  headingEl.textContent = heading;
  col.append(headingEl);

  const links = document.createElement('ul');
  links.className = 'footer-col-links';

  if (list) {
    unwrapListLinks(list);
    list.querySelectorAll('li').forEach((li) => {
      const anchor = li.querySelector('a[href]');
      if (!anchor) return;
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = anchor.href;
      link.textContent = anchor.textContent.trim();
      item.append(link);
      links.append(item);
    });
  } else {
    fallbackLinks.forEach(({ label, href }) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = href;
      link.textContent = label;
      item.append(link);
      links.append(item);
    });
  }

  col.append(links);
  return col;
}

/**
 * Builds link columns from da.live section 2 or defaults.
 * @param {Element|null} section
 * @returns {HTMLElement}
 */
function buildFooterLinks(section) {
  const nav = document.createElement('nav');
  nav.className = 'footer-links-group';
  nav.setAttribute('aria-label', 'Footer navigation');

  const wrapper = section?.querySelector('.default-content-wrapper');
  const headings = wrapper ? [...wrapper.querySelectorAll('h2, h3')] : [];
  const lists = wrapper ? [...wrapper.querySelectorAll('ul')] : [];

  if (headings.length) {
    headings.forEach((heading, index) => {
      nav.append(buildFooterColumn(
        heading.textContent.trim(),
        lists[index],
        DEFAULT_FOOTER.columns[index]?.links || [],
      ));
    });
  } else {
    DEFAULT_FOOTER.columns.forEach((column) => {
      nav.append(buildFooterColumn(column.heading, undefined, column.links));
    });
  }

  return nav;
}

/**
 * Builds copyright row from da.live section 3 or default.
 * @param {Element|null} section
 * @returns {HTMLElement}
 */
function buildFooterBottom(section) {
  const bottom = document.createElement('div');
  bottom.className = 'footer-bottom';

  const copy = document.createElement('span');
  copy.className = 'footer-copy';
  copy.textContent = section?.querySelector('p')?.textContent.trim() || DEFAULT_FOOTER.copyright;
  bottom.append(copy);

  return bottom;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  const sections = fragment ? [...fragment.querySelectorAll('.section')] : [];

  block.textContent = '';

  const root = document.createElement('div');

  const footerTop = document.createElement('div');
  footerTop.className = 'footer-top';
  footerTop.append(
    buildFooterBrand(sections[0] || null),
    buildFooterLinks(sections[1] || null),
  );

  const divider = document.createElement('div');
  divider.className = 'footer-divider';
  divider.setAttribute('role', 'separator');

  root.append(
    footerTop,
    divider,
    buildFooterBottom(sections[2] || null),
  );

  block.append(root);
}
