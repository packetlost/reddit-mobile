/*eslint max-len: 0*/

// This configuration is shared with the client. Any hidden, server-only config
// belongs in ./server instead.
import crypto from 'crypto';

import localStorageAvailable from './lib/localStorageAvailable';

const globalMessage = {
  frontPageOnly: true,
  text_html: '<p>We’re <a href="https://www.reddit.com/r/announcements/comments/3tlcil/we_are_updating_our_privacy_policy_effective_jan/">updating our privacy policy</a>, to take effect on January 1, 2016. By continuing to use m.reddit.com, you agree to the <a href="https://www.reddit.com/help/privacypolicy">new privacy policy</a>',
  expires: 'Jan 01, 2016',
};

if (globalMessage) {
  const sha = crypto.createHash('sha1');

  if (!globalMessage.text_html) {
    throw Error('Global message defined with no html');
  }

  sha.update(globalMessage.text_html);
  globalMessage.key = sha.digest('hex');
}

function config() {
  const loginPath = process.env.LOGIN_PATH || '/oauth2/login';
  const registerPath = loginPath === '/login' ? '/register' : loginPath;

  const reddit = process.env.REDDIT || 'https://www.reddit.com';

  // NOTE: It's very important that this is the root domain and not any
  // subdomain. Used for setting cookies, could cause issues like
  // losing authentication or infinite redirect loops if it doesn't work.
  const redditDomainParts = reddit
    .match(/https?:\/\/(.+)/)[1]
    .split('.');

  // Get the last two parts if the domain has multiple subdmaoins
  const rootReddit = redditDomainParts.length < 2
    ? redditDomainParts.join('.')
    : redditDomainParts.splice(redditDomainParts.length - 2, 2).join('.');

  return {
    https: process.env.HTTPS === 'true',
    httpsProxy: process.env.HTTPS_PROXY === 'true',

    debugLevel: process.env.DEBUG_LEVEL,
    postErrorURL: '/error',

    minifyAssets: process.env.MINIFY_ASSETS === 'true',

    assetPath: process.env.STATIC_BASE || '',

    origin: process.env.ORIGIN || 'http://localhost:4444',
    port: process.env.PORT || 4444,
    env: process.env.NODE_ENV || 'development',

    nonAuthAPIOrigin: process.env.NON_AUTH_API_ORIGIN || 'https://www.reddit.com',
    authAPIOrigin: process.env.AUTH_API_ORIGIN || 'https://oauth.reddit.com',

    reddit,
    rootReddit,

    googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID,
    googleTagManagerId: process.env.GOOGLE_TAG_MANAGER_ID,

    adblockTestClassName: process.env.ADBLOCK_TEST_CLASSNAME || 'ad adsense-ad googad gemini-ad openx',

    localStorageAvailable: localStorageAvailable(),

    loginPath,
    registerPath,

    statsURL: process.env.STATS_URL || 'https://stats.redditmedia.com/',
    mediaDomain: process.env.MEDIA_DOMAIN || 'www.redditmedia.com',
    adsPath: process.env.ADS_PATH || '/api/request_promo.json',
    amp: process.env.AMP,
    manifest: {},

    trackerKey: process.env.TRACKER_KEY,
    trackerEndpoint: process.env.TRACKER_ENDPOINT,
    trackerClientSecret: process.env.TRACKER_SECRET,
    trackerClientAppName: process.env.TRACKER_CLIENT_NAME,

    appName: process.env.APP_NAME || 'mweb',

    defaultCountry: process.env.DEFAULT_COUNTRY || 'US',

    // Note that this is a public key, so this can be shared.
    recaptchaSitekey: process.env.RECAPTCHA_SITEKEY || '6LeTnxkTAAAAAN9QEuDZRpn90WwKk_R1TRW_g-JC',

    // hack for now for global messages displayed with the infobar component.
    globalMessage,
  };
}

export default config();
