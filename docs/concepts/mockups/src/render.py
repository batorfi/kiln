# Renders every mockup to a 2x PNG next to this folder, with Playwright's Chromium (same sizes as render.sh).
# Usage: python3 render.py   (requires: pip install playwright && playwright install chromium)
import re, os
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
sizes = re.findall(r'^render (\S+)\s+(\d+),(\d+)', open(os.path.join(here, 'render.sh')).read(), re.M)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(device_scale_factor=2)
    for name, w, h in sizes:
        pg.set_viewport_size({'width': int(w), 'height': int(h)})
        pg.goto('file://' + os.path.join(here, name + '.html')); pg.wait_for_timeout(150)
        pg.screenshot(path=os.path.join(here, '..', name + '.png'), clip={'x': 0, 'y': 0, 'width': int(w), 'height': int(h)})
