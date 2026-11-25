const BEARER =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

const TWEET_RESULT_QUERY_ID = 'U8lc5aomF5krJzZ9vJ9wxg';

const TWEET_RESULT_FEATURES = {
  creator_subscriptions_tweet_preview_api_enabled: true,
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  rweb_cashtags_composer_attachment_enabled: true,
  responsive_web_jetfuel_frame: true,
  rweb_sports_post_context_enabled: true,
  x_elections_post_context_enabled: true,
  responsive_web_grok_share_attachment_enabled: true,
  responsive_web_grok_annotations_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  rweb_conversational_replies_downvote_enabled: false,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  content_disclosure_indicator_enabled: true,
  content_disclosure_ai_generated_indicator_enabled: true,
  responsive_web_grok_show_grok_translated_post: true,
  responsive_web_grok_analysis_button_from_backend: true,
  post_ctas_fetch_enabled: false,
  rweb_cashtags_enabled: true,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: false,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  responsive_web_profile_redirect_enabled: true,
  rweb_tipjar_consumption_enabled: false,
  verified_phone_label_enabled: false,
  responsive_web_nested_quote_preview_enabled: true,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  responsive_web_made_on_x_label_enabled: false,
  responsive_web_grok_community_note_auto_translation_is_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
};

const TWEET_RESULT_FIELD_TOGGLES = {
  withArticleRichContentState: true,
  withArticlePlainText: false,
  withArticleSummaryText: true,
  withArticleVoiceOver: true,
  withPayments: false,
};

async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...init, credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
}

let guestToken: Promise<string> | null = null;

function getGuestToken(renew: boolean): Promise<string> {
  if (renew || !guestToken) {
    const token = fetchJson('https://api.x.com/1.1/guest/activate.json', {
      method: 'POST',
      headers: { Authorization: `Bearer ${BEARER}` },
    }).then((body) => {
      const value = (body as { guest_token?: unknown })?.guest_token;
      if (typeof value !== 'string') {
        throw new Error('guest/activate.json returned no guest_token');
      }
      return value;
    });
    token.catch(() => {
      if (guestToken === token) {
        guestToken = null;
      }
    });
    guestToken = token;
  }
  return guestToken;
}

export async function fetchTweetResult(
  tweetId: string,
  language = 'en',
): Promise<unknown> {
  const query = new URLSearchParams({
    variables: JSON.stringify({
      tweetId,
      includePromotedContent: false,
      withBirdwatchNotes: false,
      withVoice: false,
      withCommunity: false,
    }),
    features: JSON.stringify(TWEET_RESULT_FEATURES),
    fieldToggles: JSON.stringify(TWEET_RESULT_FIELD_TOGGLES),
  });
  const url = `https://api.x.com/graphql/${TWEET_RESULT_QUERY_ID}/TweetResultByRestId?${query}`;
  const request = async (renew: boolean) =>
    fetchJson(url, {
      headers: {
        Authorization: `Bearer ${BEARER}`,
        'X-Guest-Token': await getGuestToken(renew),
        'X-Twitter-Active-User': 'yes',
        'X-Twitter-Client-Language': language,
      },
    });
  try {
    return await request(false);
  } catch {
    return await request(true);
  }
}
