'use strict';
(function () {
  var output, Converter;
  if (typeof exports === 'object' && typeof require === 'function') {
    // we're in a CommonJS (e.g. Node.js) module
    output = exports;
    Converter = require('./Markdown.Converter').Converter;
  } else {
    output = Markdown;
    Converter = output.Converter;
  }

  // (tags that can be opened/closed) | (tags that stand alone)
  var basic_tag_whitelist = /^(<\/?(b|blockquote|code|del|dd|dl|dt|em|h1|h2|h3|i|kbd|li|ol(?: start="\d+")?|p|pre|s|sup|sub|strong|strike|ul)>|<(br|hr)\s?\/?>)$/i;
  // <a href="url..." optional title>|</a>
  var a_white = /^(<a\shref="((https?|ftp):\/\/|\/)[-A-Za-z0-9+&@#\/%?=~_|!:,.;\(\)*[\]$]+"(\stitle="[^"<>]+")?\s?>|<\/a>)$/i;

  // <img src="url..." optional width  optional height  optional alt  optional title
  var img_white = /^(<img\ssrc="(https?:\/\/|\/)[-A-Za-z0-9+&@#\/%?=~_|!:,.;\(\)*[\]$]+"(\swidth="\d{1,3}")?(\sheight="\d{1,3}")?(\salt="[^"<>]*")?(\stitle="[^"<>]*")?\s?\/?>)$/i;

  // <iframe optional width optional height src="Youtube URL" optional frameborder optional allowfullscreen>
  var youtube_white = /^(<iframe\s(?:width="\d*"\s)?(?:height="\d*"\s)?src="https:\/\/www\.youtube\.com\/embed\/[-A-Za-z0-9+&@#\/%?=~_]+"(?:\sframeborder="0")?(?:\sallowfullscreen)?\s?>|<\/iframe>)$/i;

  // <iframe src="Vimeo URL" optional width optional height optional framewborder optional webkitallowfullscreen
  // optional mozallowfullscreen optional allowfullscreen>
  var vimeo_white = /^(<iframe\ssrc="https:\/\/player\.vimeo\.com\/video\/[-A-Za-z0-9+&@#\/%?=~_]+\?color=ffffff"(?:\swidth="\d+")?(?:\sheight="\d+")(?:\sframeborder="\d+")?(?:\swebkitallowfullscreen)?(?:\smozallowfullscreen)?(?:\sallowfullscreen)?\s?>)$/i;

  // <iframe width height scrolling frameborder src="SoundCloud URL">
  var soundcloud_white = /^(<iframe width="\d+" height="\d+" scrolling="[^"]+" frameborder="[^"]+" src="https:\/\/w\.soundcloud\.com\/[^"]+"\s?>)$/i;

  function sanitizeTag(tag) {
    if (tag.match(basic_tag_whitelist) || tag.match(a_white) || tag.match(img_white) ||
        tag.match(youtube_white) || tag.match(vimeo_white) || tag.match(soundcloud_white)) {
      return tag;
    } else {
      return '';
    }
  }

  function sanitizeHtml(html) {
    return html.replace(/<[^>]*>?/gi, sanitizeTag);
  }

  /// <summary>
  /// attempt to balance HTML tags in the html string
  /// by removing any unmatched opening or closing tags
  /// IMPORTANT: we *assume* HTML has *already* been
  /// sanitized and is safe/sane before balancing!
  ///
  /// adapted from CODESNIPPET: A8591DBA-D1D3-11DE-947C-BA5556D89593
  /// </summary>
  function balanceTags(html) {
    if (html === '') {
      return '';
    }

    var re = /<\/?\w+[^>]*(\s|$|>)/g;
    // convert everything to lower case; this makes
    // our case insensitive comparisons easier
    var tags = html.toLowerCase().match(re);

    // no HTML tags present? nothing to do; exit now
    var tagcount = (tags || []).length;
    if (tagcount === 0) {
      return html;
    }

    var tagname, tag;
    var ignoredtags = '<p><img><br><li><hr>';
    var match;
    var tagpaired = [];
    var tagremove = [];
    var needsRemoval = false;

    // loop through matched tags in forward order
    for (var ctag = 0; ctag < tagcount; ctag++) {
      tagname = tags[ctag].replace(/<\/?(\w+).*/, '$1');
      // skip any already paired tags
      // and skip tags in our ignore list; assume they're self-closed
      if (tagpaired[ctag] || ignoredtags.search('<' + tagname + '>') > -1) {
        continue;
      }

      tag = tags[ctag];
      match = -1;

      if (!/^<\//.test(tag)) {
        // this is an opening tag
        // search forwards (next tags), look for closing tags
        for (var ntag = ctag + 1; ntag < tagcount; ntag++) {
          if (!tagpaired[ntag] && tags[ntag] === '</' + tagname + '>') {
            match = ntag;
            break;
          }
        }
      }

      if (match === -1) {
        needsRemoval = tagremove[ctag] = true; // mark for removal
      } else {
        tagpaired[match] = true; // mark paired
      }
    }

    if (!needsRemoval) {
      return html;
    }

    // delete all orphaned tags from the string
    var ctag1 = 0;
    html = html.replace(re, function (m) {
      var res = tagremove[ctag1] ? '' : m;
      ++ctag1;
      return res;
    });
    return html;
  }

  output.getSanitizingConverter = function () {
    var converter = new Converter();
    converter.hooks.chain('postConversion', sanitizeHtml);
    converter.hooks.chain('postConversion', balanceTags);
    return converter;
  };
})();
