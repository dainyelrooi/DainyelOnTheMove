# Compact reading paragraphs — staging candidate

The owner requested the Tunisia journal's denser paragraph style across blogs,
Field Notes and other reading text. The reference and Arequipa story already
have identical font size, line height and paragraph margins. The visible
difference is the large number of short, separate prose blocks in Arequipa.

## Change

`assets/publishing-model.js` groups consecutive short prose blocks into reading
paragraphs. It aims for 45–75 words, leaves existing paragraphs of at least 45
words intact, and never splits an existing paragraph. Headings, lists, quotes,
bold-only subheads, standalone links, reading actions, fact-card boundaries,
multi-line blocks and sign-offs remain separate. This is deterministic display
formatting shared by initial HTML, live/cached articles and editor previews.

Saved text, entry fingerprints, public URLs, dates, photo placements, metadata,
body links and the readable existing CSS remain intact. No CMS records or
subscriber/provider jobs are changed. Static legacy articles retain their
existing authored prose and shared editorial typography.

## Verification

- 63 focused rendering, publication and public-reader fallback tests passed,
  including three added cases for content preservation and structural boundaries.
- Compared before/after HTML for all 27 entries in the current public website
  copy: exact text, non-paragraph markup, links, photographs, chapters, metadata
  and fingerprints match after ignoring paragraph tags and surrounding whitespace.
- `python tools/Compose-Site.py` completed with the existing 808-field website
  catalogue and no generated-source changes.
- Journey structure, public-trip validation and `git diff --check` passed.
- Browser inspection of initial HTML at 390px and 1000px showed compact prose,
  retained 16px mobile text and the existing 22px paragraph margin. Preview used
  published reading content and omitted runtime scripts to isolate layout;
  actual private owner editing and a physical device were not exercised.

## Recovery and release

Recovery branch `backup/compact-reading-pre-20261121` retains the original main
commit `6f75e0a932c14d59187baa2be71f16a6cdd0f08f`. This Cloud session has no local
OneDrive working folder, so no local Windows backup is claimed. The normal
staging source-backup workflow should be checked after the staging push.

Production release requires the owner's explicit approval for this candidate.
No new newsletter, publication date, schedule, account setting, security rule,
tracking, paid service or public content is part of this formatting change.
