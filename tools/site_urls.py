"""Public page URLs are extensionless; source documents remain ordinary HTML files."""
import re
from urllib.parse import urlsplit, urlunsplit

OWN_HOSTS = {'dainyelonthemove.com', 'www.dainyelonthemove.com', 'dainyelonthemove-staging.web.app'}


def clean_url(value):
    parts = urlsplit(value)
    if parts.scheme and parts.scheme not in {'http', 'https'}:
        return value
    if parts.netloc and parts.hostname not in OWN_HOSTS:
        return value
    match = re.fullmatch(r'/?([a-z0-9][a-z0-9-]*)\.html/?', parts.path)
    if not match:
        return value
    path = '/' if match[1] == 'index' else '/' + match[1]
    return urlunsplit((parts.scheme, parts.netloc, path, parts.query, parts.fragment))


def page_file(value):
    parts = urlsplit(value)
    assert not parts.scheme and not parts.netloc
    path = parts.path.strip('/')
    assert re.fullmatch(r'[a-z0-9][a-z0-9-]*(?:\.html)?', path)
    return path if path.endswith('.html') else path + '.html'


QUOTED_URL = re.compile(r'''(?P<quote>["'])(?P<url>(?:https?://(?:www\.)?dainyelonthemove\.com/|/)?[a-z0-9][a-z0-9-]*\.html(?:[?#][^"'<>\s]*)?)(?P=quote)''')


def clean_html_urls(text):
    text = QUOTED_URL.sub(lambda m: m['quote'] + clean_url(m['url']) + m['quote'], text)
    return re.sub(r'(url=)(/?[a-z0-9][a-z0-9-]*\.html(?:[?#][^"\s<>]*)?)',
                  lambda m: m[1] + clean_url(m[2]), text)
