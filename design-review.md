# Design & Accessibility Review

- **Project**: `C:\Users\papa_bear\Desktop\webcam live\react-channel-streaming-platform (16)`
- **Generated**: 2026-10-30T04:28:50+00:00
- **Findings**: 53

| Severity | Count |
| --- | --- |
| CRITICAL | 0 |
| HIGH | 4 |
| MEDIUM | 46 |
| LOW | 3 |
| INFO | 0 |


## HIGH

### <img> without an alt attribute

- **ID**: `a11y.img-missing-alt`
- **Location**: `src/components/ChannelArt.tsx:78`
- **Evidence**: `<img`
- **Impact**: Screen readers announce the file name or nothing at all. For a decorative image the correct value is alt=""; for a meaningful one it is a short description of the content.
- **Fix**: Add alt="a short description" for meaningful images, or alt="" plus aria-hidden="true" for decorative ones.
- **Reference**: https://www.w3.org/WAI/tutorials/images/

### <img> without an alt attribute

- **ID**: `a11y.img-missing-alt`
- **Location**: `src/components/ChannelArt.tsx:106`
- **Evidence**: `<img`
- **Impact**: Screen readers announce the file name or nothing at all. For a decorative image the correct value is alt=""; for a meaningful one it is a short description of the content.
- **Fix**: Add alt="a short description" for meaningful images, or alt="" plus aria-hidden="true" for decorative ones.
- **Reference**: https://www.w3.org/WAI/tutorials/images/

### <img> without an alt attribute

- **ID**: `a11y.img-missing-alt`
- **Location**: `src/components/Hero.tsx:49`
- **Evidence**: `<img`
- **Impact**: Screen readers announce the file name or nothing at all. For a decorative image the correct value is alt=""; for a meaningful one it is a short description of the content.
- **Fix**: Add alt="a short description" for meaningful images, or alt="" plus aria-hidden="true" for decorative ones.
- **Reference**: https://www.w3.org/WAI/tutorials/images/

### <img> without an alt attribute

- **ID**: `a11y.img-missing-alt`
- **Location**: `src/components/Hero.tsx:66`
- **Evidence**: `<img`
- **Impact**: Screen readers announce the file name or nothing at all. For a decorative image the correct value is alt=""; for a meaningful one it is a short description of the content.
- **Fix**: Add alt="a short description" for meaningful images, or alt="" plus aria-hidden="true" for decorative ones.
- **Reference**: https://www.w3.org/WAI/tutorials/images/


## MEDIUM

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/App.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/App.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/components/ChannelArt.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/components/ChannelArt.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/components/ChannelCard.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/components/ChannelCard.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/components/Chrome.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/components/Chrome.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### target="_blank" without rel="noopener"

- **ID**: `a11y.target-blank-noopener`
- **Location**: `src/components/Chrome.tsx:107`
- **Evidence**: `target="_blank"`
- **Impact**: The opened page receives a window.opener reference and can navigate the original tab to a phishing page.
- **Fix**: Add rel="noopener noreferrer" to the anchor.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/components/DetailModal.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/components/DetailModal.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/components/Header.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/components/Header.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/components/Hero.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/components/Hero.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/components/Icons.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/components/Icons.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/components/PlayerLayer.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/components/PlayerLayer.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/components/RadioDock.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/components/RadioDock.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/components/Row.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/components/Row.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/components/SearchPalette.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/components/SearchPalette.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/components/TopTen.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/components/TopTen.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/components/VideoPlayer.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/components/VideoPlayer.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/components/VisionPanel.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/components/VisionPanel.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### target="_blank" without rel="noopener"

- **ID**: `a11y.target-blank-noopener`
- **Location**: `src/components/VisionPanel.tsx:950`
- **Evidence**: `target="_blank"`
- **Impact**: The opened page receives a window.opener reference and can navigate the original tab to a phishing page.
- **Fix**: Add rel="noopener noreferrer" to the anchor.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/main.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/main.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/pages/Browse.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/pages/Browse.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/pages/Countries.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/pages/Countries.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/pages/Home.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/pages/Home.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/pages/MyList.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/pages/MyList.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/pages/Watch.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/pages/Watch.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations

### Missing or empty <title>

- **ID**: `seo.missing-title`
- **Location**: `src/store/app.tsx`
- **Impact**: The title is the tab label, the browser history entry, and the search result title. An empty title leaves the user with no way to know which tab they are in.
- **Fix**: Add a <title> that names the page, not just the brand.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/title

### <html> has no lang attribute

- **ID**: `a11y.missing-lang`
- **Location**: `src/store/app.tsx:1`
- **Evidence**: `<html ...>`
- **Impact**: Screen readers use the page language to pick a pronunciation engine. Without it, English text read with a Spanish voice is unintelligible.
- **Fix**: Add lang="en" (or the correct language code) to the <html> element.
- **Reference**: https://www.w3.org/International/questions/qa-html-language-declarations


## LOW

### Inline event handler attribute

- **ID**: `a11y.inline-handler`
- **Location**: `index.html:27`
- **Evidence**: `onload="this.media='all'"`
- **Impact**: Inline handlers cannot be removed by a framework, they defeat Content Security Policy without 'unsafe-inline', and they are hard to test.
- **Fix**: Attach the handler in code (onClick={...} in React, addEventListener elsewhere) so it can be composed, removed, and covered by a strict CSP.
- **Reference**: https://developer.mozilla.org/en-US/docs/Web/Hooks/Guide

### <img> without width/height or an aspect ratio

- **ID**: `perf.img-no-dimensions`
- **Location**: `src/components/ChannelArt.tsx:78`
- **Evidence**: `<img`
- **Impact**: The browser does not reserve space for the image, so it loads into an empty box and pushes the layout down. That is Cumulative Layout Shift, which directly costs Core Web Vitals score.
- **Fix**: Add explicit width and height attributes, or an aspect-ratio utility class, so the space is reserved before the image arrives.
- **Reference**: https://web.dev/articles/optimize-cls

### <img> without width/height or an aspect ratio

- **ID**: `perf.img-no-dimensions`
- **Location**: `src/components/Hero.tsx:49`
- **Evidence**: `<img`
- **Impact**: The browser does not reserve space for the image, so it loads into an empty box and pushes the layout down. That is Cumulative Layout Shift, which directly costs Core Web Vitals score.
- **Fix**: Add explicit width and height attributes, or an aspect-ratio utility class, so the space is reserved before the image arrives.
- **Reference**: https://web.dev/articles/optimize-cls
