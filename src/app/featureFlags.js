import Flags from '@r/flags';
import omitBy from 'lodash/omitBy';
import isNull from 'lodash/isNull';
import sha1 from 'sha1';

import getSubreddit from 'lib/getSubredditFromState';
import getRouteMetaFromState from 'lib/getRouteMetaFromState';
import getContentId from 'lib/getContentIdFromState';
import url from 'url';
import { getEventTracker } from 'lib/eventTracker';
import { getDevice, IOS_DEVICES, ANDROID } from 'lib/getDeviceFromState';

import { flags as flagConstants } from './constants';

const {
  BETA,
  SMARTBANNER,
  USE_BRANCH,
  VARIANT_NEXTCONTENT_BOTTOM,
  VARIANT_RECOMMENDED_BOTTOM,
  VARIANT_RECOMMENDED_TOP,
  VARIANT_RECOMMENDED_TOP_PLAIN,
  VARIANT_RECOMMENDED_BY_POST,
  VARIANT_RECOMMENDED_BY_POST_TOP_ALL,
  VARIANT_RECOMMENDED_BY_POST_TOP_DAY,
  VARIANT_RECOMMENDED_BY_POST_TOP_MONTH,
  VARIANT_RECOMMENDED_BY_POST_HOT,
  VARIANT_RECOMMENDED_SIMILAR_POSTS,
  VARIANT_SUBREDDIT_HEADER,
  VARIANT_XPROMO_BASE,
  VARIANT_XPROMO_LIST,
  VARIANT_XPROMO_RATING,
  VARIANT_XPROMO_SUBREDDIT,
  VARIANT_XPROMO_LISTING,
  VARIANT_XPROMO_FP_GIF,
  VARIANT_XPROMO_FP_STATIC,
  VARIANT_XPROMO_FP_SPEED,
  VARIANT_XPROMO_FP_TRANSPARENT,
  VARIANT_XPROMO_SUBREDDIT_TRANSPARENT,
  VARIANT_XPROMO_SUBREDDIT_EMBEDDED_APP,
  VARIANT_XPROMO_SUBREDDIT_POSTS,
  VARIANT_XPROMO_CLICK,
  VARIANT_TITLE_EXPANDO,
  VARIANT_MIXED_VIEW,
  SHOW_AMP_LINK,
} = flagConstants;

const config = {
  [BETA]: true,
  [SMARTBANNER]: {
    and: [
      { allowedPages: ['index', 'listing'] },
      { allowNSFW: false },
      { allowedDevices: IOS_DEVICES.concat(ANDROID) },
    ],
  },
  [USE_BRANCH]: true,
  [VARIANT_NEXTCONTENT_BOTTOM]: {
    url: 'experimentnextcontentbottom',
    and: [{
      variant: 'nextcontent_mweb:bottom',
    }, {
      loggedin: false,
    }],
  },
  [VARIANT_RECOMMENDED_BOTTOM]: {
    url: 'experimentrecommendedbottom',
    and: [{
      variant: 'recommended_srs:bottom',
    }, {
      loggedin: false,
    }, {
      seoReferrer: true,
    }],
  },
  [VARIANT_RECOMMENDED_TOP]: {
    url: 'experimentrecommendedtop',
    and: [{
      variant: 'recommended_srs:top',
    }, {
      loggedin: false,
    }, {
      seoReferrer: true,
    }],
  },
  [VARIANT_RECOMMENDED_TOP_PLAIN]: {
    url: 'experimentrecommendedtopplain',
    and: [{
      variant: 'recommended_srs:plain_list_top',
    }, {
      loggedin: false,
    }, {
      seoReferrer: true,
    }],
  },
  [VARIANT_RECOMMENDED_BY_POST]: {
    url: 'experimentrecommendedposttosubreddits',
    and: [{
      loggedin: false,
    }, {
      variant: 'subreddits_by_post:sr_by_post',
    }],
  },
  [VARIANT_RECOMMENDED_BY_POST_TOP_ALL]: {
    url: 'experimentrecommendedposttosubredditstopoststopall',
    and: [{
      loggedin: false,
    }, {
      variant: 'subreddits_by_post:posts_by_sr_by_post_top_all',
    }],
  },
  [VARIANT_RECOMMENDED_BY_POST_TOP_DAY]: {
    url: 'experimentrecommendedposttosubredditstopoststopday',
    and: [{
      loggedin: false,
    }, {
      variant: 'subreddits_by_post:posts_by_sr_by_post_top_day',
    }],
  },
  [VARIANT_RECOMMENDED_BY_POST_TOP_MONTH]: {
    url: 'experimentrecommendedposttosubredditstopoststopmonth',
    and: [{
      loggedin: false,
    }, {
      variant: 'subreddits_by_post:posts_by_sr_by_post_top_month',
    }],
  },
  [VARIANT_RECOMMENDED_BY_POST_HOT]: {
    url: 'experimentrecommendedposttosubredditstopostshot',
    and: [{
      loggedin: false,
    }, {
      variant: 'subreddits_by_post:posts_by_sr_by_post_hot',
    }],
  },
  [VARIANT_RECOMMENDED_SIMILAR_POSTS]: {
    url: 'experimentrecommendedsimilarposts',
    and: [{
      loggedin: false,
    }, {
      variant: 'subreddits_by_post:similar_posts',
    }],
  },
  [VARIANT_SUBREDDIT_HEADER]: {
    url: 'experimentsubredditheader',
    and: [{
      variant: 'recommended_srs:sr_name_top',
    }, {
      loggedin: false,
    }, {
      seoReferrer: true,
    }],
  },
  [VARIANT_XPROMO_BASE]: false,
  // As a temporary hack, we are showing the list treatment also to users
  // bucketed into the control groups. We want to continue to get bucketing
  // events, so we know when a user has been exposed to this feature, and we
  // want to show 100% of users the list treatment. We can't eliminate control
  // groups in the API's bucketing mechanism, so we use this hack instead.
  [VARIANT_XPROMO_LIST]: {
    and: [
      { notOptedOut: 'xpromoInterstitial' },
      { allowedPages: ['index'] },
      { or: [
        { and: [
          { allowedDevices: [ANDROID] },
          { or: [
            { variant: 'mweb_xpromo_interstitial_fp_android:list' },
            { variant: 'mweb_xpromo_interstitial_fp_android:control_1' },
            { variant: 'mweb_xpromo_interstitial_fp_android:control_2' },
            { url: 'xpromolist' },
          ] },
        ] },
        { and: [
          { allowedDevices: IOS_DEVICES },
          { or: [
            { variant: 'mweb_xpromo_interstitial_fp_ios:list' },
            { variant: 'mweb_xpromo_interstitial_fp_ios:control_1' },
            { variant: 'mweb_xpromo_interstitial_fp_ios:control_2' },
            { url: 'xpromolist' },
          ] },
        ] },
      ] },
    ],
  },
  [VARIANT_XPROMO_RATING]: false,
  [VARIANT_XPROMO_LISTING]: false,
  // As a temporary hack, we are showing the subreddit treatment also to users
  // bucketed into the control groups. We want to continue to get bucketing
  // events, so we know when a user has been exposed to this feature, and we
  // want to show 100% of users the subreddit treatment. We can't eliminate
  // control groups in the API's bucketing mechanism, so we use this hack
  // instead.
  [VARIANT_XPROMO_SUBREDDIT]: {
    and: [
      { notOptedOut: 'xpromoInterstitial' },
      { allowedPages: ['listing'] },
      { allowNSFW: false },
      { or: [
        { and: [
          { allowedDevices: [ANDROID] },
          { or: [
            { variant: 'mweb_xpromo_interstitial_listing_android:subreddit' },
            { variant: 'mweb_xpromo_interstitial_listing_android:control_1' },
            { variant: 'mweb_xpromo_interstitial_listing_android:control_2' },
            { url: 'xpromosubreddit' },
          ] },
        ] },
        { and: [
          { allowedDevices: IOS_DEVICES },
          { or: [
            { variant: 'mweb_xpromo_interstitial_listing_ios:subreddit' },
            { variant: 'mweb_xpromo_interstitial_listing_ios:control_1' },
            { variant: 'mweb_xpromo_interstitial_listing_ios:control_2' },
            { url: 'xpromosubreddit' },
          ] },
        ] },
      ] },
    ],
  },
  [VARIANT_XPROMO_FP_GIF]: {
    and: [
      { allowedDevices: IOS_DEVICES.concat(ANDROID) },
      { allowedPages: ['index'] },
      { or: [
        { url: 'xpromofpgif' },
        { variant: 'mweb_xpromo_interstitial_fp_v2:gif' },
      ] },
    ],
  },
  [VARIANT_XPROMO_FP_TRANSPARENT]: {
    and: [
      { allowedDevices: IOS_DEVICES.concat(ANDROID) },
      { allowedPages: ['index'] },
      { or: [
        { url: 'xpromofptransparent' },
        { variant: 'mweb_xpromo_interstitial_fp_v2:transparent' },
      ] },
    ],
  },
  [VARIANT_XPROMO_FP_STATIC]: {
    and: [
      { allowedDevices: IOS_DEVICES.concat(ANDROID) },
      { allowedPages: ['index'] },
      { or: [
        { url: 'xpromofpstatic' },
        { variant: 'mweb_xpromo_interstitial_fp_v2:static' },
      ] },
    ],
  },
  [VARIANT_XPROMO_FP_SPEED]: {
    and: [
      { allowedDevices: IOS_DEVICES.concat(ANDROID) },
      { allowedPages: ['index'] },
      { or: [
        { url: 'xpromofpspeed' },
        { variant: 'mweb_xpromo_interstitial_fp_v2:speed' },
      ] },
    ],
  },
  [VARIANT_XPROMO_SUBREDDIT_TRANSPARENT]: {
    and: [
      { allowedDevices: IOS_DEVICES.concat(ANDROID) },
      { allowedPages: ['listing'] },
      { allowNSFW: false },
      { or: [
        { url: 'xpromosubreddittransparent' },
        { variant: 'mweb_xpromo_interstitial_listing_v2:transparent' },
      ] },
    ],
  },
  [VARIANT_XPROMO_SUBREDDIT_EMBEDDED_APP]: {
    and: [
      { allowedDevices: IOS_DEVICES.concat(ANDROID) },
      { allowedPages: ['listing'] },
      { allowNSFW: false },
      { or: [
        { url: 'xpromosubredditembedded' },
        { variant: 'mweb_xpromo_interstitial_listing_v2:embedded' },
      ] },
    ],
  },
  [VARIANT_XPROMO_SUBREDDIT_POSTS]: {
    and: [
      { allowedDevices: IOS_DEVICES.concat(ANDROID) },
      { allowedPages: ['listing'] },
      { allowNSFW: false },
      { or: [
        { url: 'xpromosubredditposts' },
        { variant: 'mweb_xpromo_interstitial_listing_v2:posts' },
      ] },
    ],
  },
  [VARIANT_XPROMO_CLICK]: false,
  [VARIANT_TITLE_EXPANDO]: {
    and: [
      { compact: true},
      { or: [
          { url: 'titleexpando' },
          { variant: 'mweb_post_title_expando:active' },
      ] },
    ],
  },
  [VARIANT_MIXED_VIEW]: {
    and: [
      { compact: false },
      { or: [
        { variant: 'mweb_mixed_view:active'},
        { url: 'mixedview'},
      ] },
    ],
  },
  [SHOW_AMP_LINK]: {
    url: 'showamplink',
    pageBucketPercent: {
      seed: 'showamplink',
      percentage: 2,
    },
  },
};

const flags = new Flags(config);
const SEO_REFERRERS = [
  'google.com',
  'bing.com',
];

function extractUser(ctx) {
  const { state } = ctx;
  if (!state || !state.user || !state.accounts) {
    return;
  }
  return state.accounts[state.user.name];
}

flags.addRule('loggedin', function(val) {
  return (!!this.state.user && !this.state.user.loggedOut) === val;
});

flags.addRule('users', function(users) {
  const user = extractUser(this);
  return users.includes(user.name);
});

flags.addRule('employee', function(val) {
  return extractUser(this).is_employee === val;
});

flags.addRule('admin', function(val) {
  return extractUser(this).is_admin === val;
});

flags.addRule('beta', function(val) {
  return extractUser(this).is_beta === val;
});

flags.addRule('url', function(query) {
  // turns { feature_thing: true, wat: 7 } into { thing: true }
  const parsedQuery = Flags.parseConfig(this.state.platform.currentPage.queryParams);
  return Object.keys(parsedQuery).includes(query);
});

flags.addRule('compact', function(val) {
  return this.state.compact === val;
});

flags.addRule('subreddit', function (name) {
  const subreddit = getSubreddit(this.state);
  if (!subreddit) {
    return false;
  }

  return subreddit.toLowerCase() === name.toLowerCase();
});

const firstBuckets = new Set();

flags.addRule('variant', function (name) {
  const [experiment_name, checkedVariant] = name.split(':');
  const user = extractUser(this);

  if (user && user.features && user.features[experiment_name]) {
    const { variant, experiment_id } = user.features[experiment_name];

    // we only want to bucket the user once per session for any given experiment.
    // to accomplish this, we're going to use the fact that featureFlags is a
    // singleton, and use `firstBuckets` (which is in this module's closure's
    // scope) to keep track of which experiments we've already bucketed.
    if (this.state.meta.env === 'CLIENT' && !firstBuckets.has(experiment_name)) {
      firstBuckets.add(experiment_name);

      const eventTracker = getEventTracker();
      const payload = {
        experiment_id,
        experiment_name,
        variant,
        user_id: !this.state.user.loggedOut ? parseInt(user.id, 36) : null,
        user_name: !this.state.user.loggedOut ? user.name : null,
        loid: this.state.user.loggedOut ? this.state.loid.loid : null,
        loidcreated: this.state.user.loggedOut ? this.state.loid.loidCreated : null,
      };

      eventTracker.track('bucketing_events', 'cs.bucket', omitBy(payload, isNull));
    }

    return variant === checkedVariant;
  }
  return false;
});

// need to keep this function format (not arrow format) to protect
// the value of 'this'
flags.addRule('seoReferrer', function (wantSEO) {
  // Make sure we have a referrer and from the outside
  const referrer = this.state.platform.currentPage.referrer;
  if (!referrer || !referrer.startsWith('http')) {
    return !wantSEO;
  }

  // Check if the referrer matches the list of hostnames
  const referrerHostname = url.parse(referrer).hostname;
  const isSEO = SEO_REFERRERS.some(seo => {
    return referrerHostname.indexOf(seo) !== -1;
  });

  // Compare if we want the user to be from SEO or not
  return (isSEO === wantSEO);
});

flags.addRule('directVisit', function (wantDirect) {
  const referrer = this.state.platform.currentPage.referrer;

  // TODO: We end up adding the initial page to the history twice, once due to
  // the platform SET_STATUS action and once due to the SET_PAGE action.
  const isDirect = !referrer && this.state.platform.history.length <= 2;

  return isDirect === wantDirect;
});

flags.addRule('allowedPages', function (allowedPages) {
  const routeMeta = getRouteMetaFromState(this.state);
  const actionName = routeMeta && routeMeta.name;
  return allowedPages.includes(actionName);
});

// This returns false when no loidCreated value is present, but it should
// really be used in conjunction with a loggedin: false rule, in which case we
// expect to have an loidCreated value.
flags.addRule('minLoidAge', function (minAge) {
  const loidCreated = this.state.accounts.me && this.state.accounts.me.loidCreated;

  if (!loidCreated) {
    return false;
  }

  const age = (new Date()) - (new Date(loidCreated));
  if (age < minAge) { return false; }

  return true;
});

flags.addRule('allowedDevices', function (allowed) {
  const device = getDevice(this.state);
  // If we don't know what device we're on, then we should not match any list
  // of allowed devices.
  return (!!device) && allowed.includes(device);
});

flags.addRule('notOptedOut', function (flag) {
  const optedOut = this.state.optOuts[flag];
  return !optedOut;
});

// NOTE (prashant.singh - 07 November 2016): This is interim functionality to
// allow simple feature flagging for a percentage of pages. It should not be
// used for true page or user experiments.
// Bucket pages based on content ID, using granularity of 1/10th of a percent.
flags.addRule('pageBucketPercent', function(config) {
  const { seed, percentage } = config;
  const contentId = getContentId(this.state);
  const hashed = sha1(`${seed}${contentId}`);

  // hashed is a 160-bit number expressed as a hex string.
  // We want to find (hashed % 1000), so we can map the hash to bucket sizes
  // with 0.1% granularity. We can't work directly with 160-bit values as
  // JavaScript Numbers, so we compute the modulo in pieces.
  // piece3 is the most significant 10 hex digits (40 bits) of the 160-bit
  // value `hashed` (left shift of 120 bits).
  // piece2 is the 10 next most significant hex digits of hashed (left shift of
  // 80 bits).
  // and so on for piece1 and piece0.
  const piece3 = parseInt(hashed.slice(0,10), 16);
  const piece2 = parseInt(hashed.slice(10,20), 16);
  const piece1 = parseInt(hashed.slice(20,30), 16);
  const piece0 = parseInt(hashed.slice(30,40), 16);
  // So hashed = piece3 * 2^120 + piece2 * 2^80 + piece1 * 2^40 + piece1 * 2^0.
  // And hashed mod 1000 =
  // (((piece3 mod 1000) * (2^120 mod 1000) mod 1000) +
  //  ((piece2 mod 1000) * (2^80 mod 1000) mod 1000) +
  //  ((piece1 mod 1000) * (2^40 mod 1000) mod 1000) +
  //  (piece0 mod 1000)) mod 1000
  // 2^120 mod 1000 = 576
  // 2^80 mod 1000 = 176
  // 2^40 mod 1000 = 776
  const val =
    (((piece3 % 1000)*576 % 1000) +
      ((piece2 % 1000)*176 % 1000) +
      ((piece1 % 1000)*776 % 1000) +
      (piece0 % 1000)
    ) % 1000;

  return val <= 10 * percentage;
});

flags.addRule('allowNSFW', function(allowed) {
  const { subreddits } = this.state;
  const subredditName = getSubreddit(this.state);

  if (allowed) {
    return true;
  }

  if (!subredditName) {
    return false;
  }

  const subredditInfo = subreddits[subredditName.toLowerCase()];
  if (subredditInfo) {
    return !subredditInfo.over18;
  }
  return false;
});

export default flags;
