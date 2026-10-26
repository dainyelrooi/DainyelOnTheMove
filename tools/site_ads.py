"""Shared, public-only consent bootstrap; never an unguarded third-party tag."""
import re

EXCLUDED = {'admin.html', 'postcards-form.html', '404.html', 'search.html',
            'blog.html', 'destinations.html', 'updates.html', 'qa.html', 'collaborate.html'}


def consent_head(text, filename):
    # Some generated archives already have the old tag. Always emit at most one.
    text = re.sub(r'<script\b[^>]*\bsrc=[\"\']/?assets/(?:analytics|privacy)-consent\.js(?:\?[^\"\']*)?[\"\'][^>]*>\s*</script>', '', text)
    if filename in EXCLUDED or '<footer' not in text:
        return text
    page = filename.removesuffix('.html')
    if not re.fullmatch(r'[a-z0-9-]+', page):
        raise ValueError('Invalid public consent page')
    head = ('<meta name="google-adsense-account" content="ca-pub-9073450763802389"/>'
            '<script defer src="/assets/privacy-consent.js" data-consent-page="' + page + '"></script>')
    return text.replace('</head>', head + '</head>', 1)
