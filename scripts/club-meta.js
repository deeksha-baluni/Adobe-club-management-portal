/**
 * club-meta.js — Extra club metadata for detail pages
 */
'use strict';

window.AdobeClubMeta = {
  partners: ['Adobe People Team', 'Bengaluru Chapter', 'Campus Facilities', 'Adobe EDS', 'Clubs Admin'],

  /** Related clubs shown in Popular communities on each detail page */
  relatedCommunities: {
    'adobe-lens': ['adobe-creatives', 'green-adobe', 'dev-guild'],
    'dev-guild': ['adobe-creatives', 'adobe-lens', 'board-games'],
    'sportzone': ['mental-health', 'volunteering-club', 'green-adobe'],
    'adobe-creatives': ['adobe-lens', 'dev-guild', 'food-brew'],
    'food-brew': ['book-club', 'adobe-creatives', 'board-games'],
    'book-club': ['mental-health', 'dev-guild', 'food-brew'],
    'board-games': ['dev-guild', 'food-brew', 'sportzone'],
    'green-adobe': ['volunteering-club', 'mental-health', 'sportzone'],
    'volunteering-club': ['green-adobe', 'mental-health', 'food-brew'],
    'mental-health': ['sportzone', 'book-club', 'volunteering-club'],
  },

  activities: {
    'adobe-lens':      ['Photo walks', 'Editing workshops', 'Street photography', 'Weekly shoots', 'Lightroom tips'],
    'dev-guild':       ['Hackathons', 'Code reviews', 'Side projects', 'Tech talks', 'Open source'],
    'sportzone':       ['Cricket league', 'Football matches', 'Badminton', 'Wellness runs', 'Tournaments'],
    'adobe-creatives': ['Design jams', 'Portfolio reviews', 'UI challenges', 'Creative sprints', 'Figma sessions'],
    'food-brew':       ['Lunch potlucks', 'Cuisine tastings', 'Blind taste tests', 'Cooking challenges', 'Restaurant walks'],
    'book-club':       ['Monthly reads', 'Author spotlights', 'Genre rotations', 'Writing workshops', 'Book swaps'],
    'board-games':     ['Weekly game nights', 'Strategy tournaments', 'D&D campaigns', 'Game design workshops', 'Library swap'],
    'green-adobe':     ['Campus clean-ups', 'Sustainability audits', 'Zero-waste challenges', 'Tree planting', 'Eco swaps'],
    'volunteering-club': ['NGO partnerships', 'Skills volunteering', 'Fundraiser runs', 'Teaching visits', 'Coding camps'],
    'mental-health':   ['Conversation circles', 'Burnout awareness', 'Journalling workshops', 'Stress management', 'Peer support'],
  },

  /** Per-activity cadence for clubs listing filters (weekly | monthly | biweekly) */
  activityCadence: {
    'adobe-lens': {
      'Photo walks': 'monthly',
      'Editing workshops': 'monthly',
      'Street photography': 'biweekly',
      'Weekly shoots': 'weekly',
      'Lightroom tips': 'biweekly',
    },
    'dev-guild': {
      'Hackathons': 'monthly',
      'Code reviews': 'weekly',
      'Side projects': 'biweekly',
      'Tech talks': 'monthly',
      'Open source': 'biweekly',
    },
    'sportzone': {
      'Cricket league': 'weekly',
      'Football matches': 'weekly',
      'Badminton': 'biweekly',
      'Wellness runs': 'weekly',
      'Tournaments': 'monthly',
    },
    'adobe-creatives': {
      'Design jams': 'biweekly',
      'Portfolio reviews': 'monthly',
      'UI challenges': 'weekly',
      'Creative sprints': 'biweekly',
      'Figma sessions': 'weekly',
    },
    'food-brew': {
      'Lunch potlucks': 'weekly',
      'Cuisine tastings': 'monthly',
      'Blind taste tests': 'biweekly',
      'Cooking challenges': 'monthly',
      'Restaurant walks': 'biweekly',
    },
    'book-club': {
      'Monthly reads': 'monthly',
      'Author spotlights': 'monthly',
      'Genre rotations': 'biweekly',
      'Writing workshops': 'monthly',
      'Book swaps': 'biweekly',
    },
    'board-games': {
      'Weekly game nights': 'weekly',
      'Strategy tournaments': 'monthly',
      'D&D campaigns': 'biweekly',
      'Game design workshops': 'monthly',
      'Library swap': 'biweekly',
    },
    'green-adobe': {
      'Campus clean-ups': 'monthly',
      'Sustainability audits': 'biweekly',
      'Zero-waste challenges': 'monthly',
      'Tree planting': 'monthly',
      'Eco swaps': 'biweekly',
    },
    'volunteering-club': {
      'NGO partnerships': 'monthly',
      'Skills volunteering': 'biweekly',
      'Fundraiser runs': 'monthly',
      'Teaching visits': 'monthly',
      'Coding camps': 'biweekly',
    },
    'mental-health': {
      'Conversation circles': 'weekly',
      'Burnout awareness': 'monthly',
      'Journalling workshops': 'biweekly',
      'Stress management': 'monthly',
      'Peer support': 'weekly',
    },
  },

  activityDetails: {
    'sportzone': {
      'Cricket league': 'Inter-floor cricket every Thursday with rotating squads, friendly rivalry, and a season finale on the sports ground.',
      'Football matches': 'Friday evening five-a-side on the campus pitch — drop in whether you play weekly or want your first kickabout.',
      'Badminton': 'Morning and lunch-hour court sessions with mixed doubles, beginner brackets, and borrowed racquets when you need them.',
      'Wellness runs': 'Guided 3K and 5K loops around campus to stretch your legs, clear your head, and meet runners from other teams.',
      'Tournaments': 'Seasonal knockouts across cricket, football, and badminton with trophies, team kits, and a crowd on match day.',
    },
    'adobe-lens': {
      'Photo walks': 'Explore Bengaluru streets together — golden hour routes, shared gear tips, and gentle critique along the way.',
      'Editing workshops': 'Hands-on Lightroom and Photoshop sessions from exposure fixes to colour grading, for every skill level.',
      'Street photography': 'Practice composition and timing in busy neighbourhoods with a small group and a volunteer mentor.',
      'Weekly shoots': 'A standing calendar slot for members to meet, shoot a theme, and share selects in the club channel.',
      'Lightroom tips': 'Short lunch-and-learn demos on presets, batch edits, and a tidy workflow for your personal archive.',
    },
    'dev-guild': {
      'Hackathons': 'Forty-eight hours of building with team formation, mentors on tap, and demos that actually ship prototypes.',
      'Code reviews': 'Bring a PR or side project for constructive feedback in a supportive, no-judgement room.',
      'Side projects': 'Accountability circles for the app, tool, or experiment you keep meaning to finish after hours.',
      'Tech talks': 'Lightning talks and deep dives from members on stacks, patterns, and lessons from production.',
      'Open source': 'Find collaborators for issues, first contributions, and maintainership stories from inside Adobe.',
    },
  },

  founded: {
    'adobe-lens': '2021', 'dev-guild': '2020', 'sportzone': '2022',
    'adobe-creatives': '2021', 'food-brew': '2022', 'book-club': '2020',
    'board-games': '2021', 'green-adobe': '2022', 'volunteering-club': '2021',
    'mental-health': '2023',
  },

  heroHeadline: {
    'adobe-lens':      { line1: 'Find Your Frame', line2: 'Capture Your Story' },
    'dev-guild':       { line1: 'Find Your Stack', line2: 'Ship Your Ideas' },
    'sportzone':       { line1: 'Find Your Team', line2: 'Play Your Game' },
    'adobe-creatives': { line1: 'Find Your Voice', line2: 'Design Your World' },
    'food-brew':       { line1: 'Find Your Flavour', line2: 'Share Your Table' },
    'book-club':       { line1: 'Find Your Story', line2: 'Turn Every Page' },
    'board-games':     { line1: 'Find Your Table', line2: 'Play Your Move' },
    'green-adobe':     { line1: 'Find Your Impact', line2: 'Grow Our Campus' },
    'volunteering-club': { line1: 'Find Your Cause', line2: 'Give Your Time' },
    'mental-health':   { line1: 'Find Your Balance', line2: 'Support Each Other' },
  },

  mission: {
    'adobe-lens': 'Connect photographers across Adobe Bengaluru through weekly shoots, editing workshops, and a welcoming community for every skill level.',
    'dev-guild': 'Bring engineers together to learn, build, and ship — through hackathons, code reviews, and a culture of curiosity.',
    'sportzone': 'Connect athletes and wellness enthusiasts through leagues, pickup games, and campus activities that keep everyone moving.',
    'adobe-creatives': 'Unite designers and makers through jams, portfolio nights, and creative experiments beyond the day job.',
    'food-brew': 'Celebrate our diversity through potlucks, tastings, and food discovery walks across Bengaluru.',
    'book-club': 'Build a reading community with monthly picks, open discussions, and space for every reading pace.',
    'board-games': 'Create unplugged fun through game nights, tournaments, and a shared library for every player.',
    'green-adobe': 'Drive sustainability on campus through clean-ups, audits, and zero-waste challenges anyone can join.',
    'volunteering-club': 'Channel Adobe talent into meaningful community impact through NGO partnerships and skills-based volunteering.',
    'mental-health': 'Offer a confidential, peer-led space for conversation, awareness, and practical wellbeing support.',
  },

  vision: {
    'adobe-lens': 'A chapter where every colleague feels confident picking up a camera and sharing how they see Bengaluru.',
    'dev-guild': 'A builder culture where side projects, mentorship, and innovation thrive across every team.',
    'sportzone': 'The most active sports community on campus — where every floor has a team and every game has a crowd.',
    'adobe-creatives': 'A creative hub where personal projects get the spotlight and designers inspire each other daily.',
    'food-brew': 'The tastiest lunch break in the office — where every cuisine finds a seat at the table.',
    'book-club': 'A chapter-wide reading habit — one book, one conversation, one new idea at a time.',
    'board-games': 'A weekly ritual of strategy, laughter, and connection away from the screen.',
    'green-adobe': 'A zero-waste campus mindset powered by small actions and measurable change.',
    'volunteering-club': 'Every Adobe employee finding one meaningful way to give back each quarter.',
    'mental-health': 'A workplace where asking for support is normal, safe, and met with empathy.',
  },

  aboutExtra: {
    'adobe-lens': 'From golden-hour rooftop sessions to Lightroom deep-dives, Adobe Lens is where photographers share gear, critique kindly, and build a visual record of life at Adobe Bengaluru.',
    'dev-guild': 'Whether you ship production code or prototype on weekends, Dev Guild gives you builders, mentors, and friendly competition to level up your craft.',
    'sportzone': 'Inter-floor leagues, weekend wellness runs, and pickup games — SportZone keeps the campus moving and gives every team a reason to cheer.',
    'adobe-creatives': 'Design jams, portfolio nights, and experimental side projects live here. Bring your Figma files, sketchbook, or just curiosity.',
    'food-brew': 'Potlucks, cuisine-of-the-month tastings, and restaurant discovery walks celebrate the diversity of our office.',
    'book-club': 'Fiction, non-fiction, and tech reads rotate each month with relaxed discussions and occasional writing workshops.',
    'board-games': 'Strategy nights, D&D campaigns, and a community game library make this the go-to crew for unplugged fun.',
    'green-adobe': 'Campus clean-ups, zero-waste challenges, and sustainability audits turn small habits into measurable impact.',
    'volunteering-club': 'NGO partnerships, skills-based volunteering, and community coding camps connect Adobe talent with causes that matter.',
    'mental-health': 'Peer-led circles, burnout awareness sessions, and practical stress tools — a confidential space to share or listen.',
  },

  featured: {
    'adobe-lens': { title: 'Street photography walk — MG Road', excerpt: 'Join this month\'s flagship shoot along MG Road. All cameras welcome.' },
    'dev-guild': { title: 'Hackathon Kickoff 2025', excerpt: 'Team formation, problem reveals, and 48 hours of building ahead.' },
    'sportzone': { title: 'Cricket League — Round 2', excerpt: 'Cheer from the stands or fill an open spot on the roster.' },
    'adobe-creatives': { title: 'GenAI Design Sprint', excerpt: 'Fast-paced teams tackle a live brief with generative tools.' },
    'food-brew': { title: 'Cuisine of the Month — Kerala Special', excerpt: 'Potluck flavours, recipe swaps, and a friendly vote at lunch.' },
    'book-club': { title: 'June Read — Atomic Habits', excerpt: 'Drop in for discussion — no prep required, just honest chat.' },
    'board-games': { title: 'Settlers of Catan Tournament', excerpt: 'Beginner tables available. Winner takes the Guild Trophy.' },
    'green-adobe': { title: 'Campus Clean-up Drive', excerpt: 'Kick off zero-waste July with gloves, bags, and a quick audit.' },
    'volunteering-club': { title: 'Community coding camp', excerpt: 'Weekend teaching visit — mentors needed for HTML and Python intro.' },
    'mental-health': { title: 'Burnout & Balance — Open Circle', excerpt: 'A safe, informal space to share, listen, or simply be present.' },
  },

  testimonials: {
    'adobe-lens': { quote: 'I picked up a camera for the first time here — now I shoot every weekend with people I genuinely like.', name: 'Ananya R.', role: 'Member since 2022' },
    'dev-guild': { quote: 'Our hackathon squad became my closest friends at Adobe. We still ship side projects together.', name: 'Karthik M.', role: 'Engineering · Member since 2021' },
    'sportzone': { quote: 'I joined for cricket and stayed for the community. Best way to know people outside your floor.', name: 'Rahul S.', role: 'League captain' },
    'adobe-creatives': { quote: 'Portfolio night gave me the confidence to share personal work I\'d never shown anyone.', name: 'Meera P.', role: 'Product Designer' },
    'food-brew': { quote: 'Every potluck feels like travelling without leaving the cafeteria.', name: 'Divya K.', role: 'Club organiser' },
    'book-club': { quote: 'I don\'t always finish the book — but I always leave with one new idea.', name: 'James T.', role: 'Reader · 3 years' },
    'board-games': { quote: 'Thursday nights are sacred. Strategy, laughter, and zero Slack notifications.', name: 'Vikram N.', role: 'Tournament regular' },
    'green-adobe': { quote: 'Small actions add up. Our audit changed how our floor handles single-use plastics.', name: 'Priya L.', role: 'Sustainability lead' },
    'volunteering-club': { quote: 'Teaching kids to code reminded me why I became an engineer.', name: 'Arjun J.', role: 'Volunteer mentor' },
    'mental-health': { quote: 'Knowing there\'s a room where you can be honest about stress — that alone makes a difference.', name: 'Sneha V.', role: 'Peer supporter' },
  },

  memberQuotes: {
    'adobe-lens': [
      { quote: 'Found a great creative outlet outside work.', name: 'Ananya' },
      { quote: 'The weekly walks are a great way to unwind.', name: 'Vikram' },
      { quote: 'Very welcoming for beginners.', name: 'Meera' },
    ],
    'sportzone': [
      { quote: 'Best way to meet people outside your floor.', name: 'Rahul' },
      { quote: 'League nights are the highlight of my week.', name: 'Priya' },
      { quote: 'Open to every skill level — just show up.', name: 'Arjun' },
    ],
  },

  leads: {
    'adobe-lens': [
      { name: 'Priya Sharma', role: 'Lead since 2022', initials: 'PS' },
      { name: 'Rohan Kapoor', role: 'Co-lead', initials: 'RK' },
    ],
    'dev-guild': [
      { name: 'Arjun K.', role: 'Lead since 2020', initials: 'AK' },
      { name: 'Neha R.', role: 'Co-lead', initials: 'NR' },
    ],
    'sportzone': [
      { name: 'Vikram P.', role: 'League captain', initials: 'VP' },
      { name: 'Sneha M.', role: 'Co-lead', initials: 'SM' },
    ],
    'adobe-creatives': [
      { name: 'Meera P.', role: 'Lead since 2021', initials: 'MP' },
      { name: 'James T.', role: 'Co-lead', initials: 'JT' },
    ],
    'food-brew': [
      { name: 'Divya K.', role: 'Club organiser', initials: 'DK' },
      { name: 'Rahul S.', role: 'Co-lead', initials: 'RS' },
    ],
    'book-club': [
      { name: 'James T.', role: 'Lead since 2020', initials: 'JT' },
      { name: 'Ananya R.', role: 'Co-lead', initials: 'AR' },
    ],
    'board-games': [
      { name: 'Vikram N.', role: 'Lead since 2021', initials: 'VN' },
      { name: 'Priya L.', role: 'Co-lead', initials: 'PL' },
    ],
    'green-adobe': [
      { name: 'Priya L.', role: 'Sustainability lead', initials: 'PL' },
      { name: 'Arjun J.', role: 'Co-lead', initials: 'AJ' },
    ],
    'volunteering-club': [
      { name: 'Arjun J.', role: 'Lead since 2021', initials: 'AJ' },
      { name: 'Sneha V.', role: 'Co-lead', initials: 'SV' },
    ],
    'mental-health': [
      { name: 'Sneha V.', role: 'Peer lead', initials: 'SV' },
      { name: 'Meera P.', role: 'Co-facilitator', initials: 'MP' },
    ],
  },

  /** Slack channels — discussion layer for each club */
  slack: {
    'adobe-lens': { channel: 'club-adobe-lens', url: 'https://adobe.enterprise.slack.com/archives/club-adobe-lens', label: '#club-adobe-lens' },
    'dev-guild': { channel: 'club-dev-guild', url: 'https://adobe.enterprise.slack.com/archives/club-dev-guild', label: '#club-dev-guild' },
    'sportzone': { channel: 'club-sportzone', url: 'https://adobe.enterprise.slack.com/archives/club-sportzone', label: '#club-sportzone' },
    'adobe-creatives': { channel: 'club-adobe-creatives', url: 'https://adobe.enterprise.slack.com/archives/club-adobe-creatives', label: '#club-adobe-creatives' },
    'food-brew': { channel: 'club-food-brew', url: 'https://adobe.enterprise.slack.com/archives/club-food-brew', label: '#club-food-brew' },
    'book-club': { channel: 'club-book-club', url: 'https://adobe.enterprise.slack.com/archives/club-book-club', label: '#club-book-club' },
    'board-games': { channel: 'club-board-games', url: 'https://adobe.enterprise.slack.com/archives/club-board-games', label: '#club-board-games' },
    'green-adobe': { channel: 'club-green-adobe', url: 'https://adobe.enterprise.slack.com/archives/club-green-adobe', label: '#club-green-adobe' },
    'volunteering-club': { channel: 'club-volunteering', url: 'https://adobe.enterprise.slack.com/archives/club-volunteering', label: '#club-volunteering' },
    'mental-health': { channel: 'club-wellbeing', url: 'https://adobe.enterprise.slack.com/archives/club-wellbeing', label: '#club-wellbeing' },
    organization: { channel: 'adobe-clubs', url: 'https://adobe.enterprise.slack.com/archives/adobe-clubs', label: '#adobe-clubs' },
  },

  /** Organizer email for event questions (shown to signed-in users in event modal) */
  organizerContact: {
    default: 'clubs-admin@adobe.com',
    'adobe-lens': 'adobe-lens-club@adobe.com',
    'dev-guild': 'dev-guild-club@adobe.com',
    'sportzone': 'sportzone-club@adobe.com',
    'adobe-creatives': 'adobe-creatives-club@adobe.com',
    'food-brew': 'food-brew-club@adobe.com',
    'book-club': 'book-club@adobe.com',
    'board-games': 'board-games-club@adobe.com',
    'green-adobe': 'green-adobe-club@adobe.com',
    'volunteering-club': 'volunteering-club@adobe.com',
    'mental-health': 'wellbeing-club@adobe.com',
  },
};
