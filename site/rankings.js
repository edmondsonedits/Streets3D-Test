import { calculateTotal, calculateVisualScore, rankRatings } from './ratings-core.mjs';

const byId = (id) => document.getElementById(id);
const groups = byId('groupFilters');
const list = byId('rankings');
const errorBox = byId('loadError');
const dataUrl = new URL('./ratings/ratings.json', import.meta.url);
const number = new Intl.NumberFormat('en-CA');

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined && text !== null) element.textContent = String(text);
  return element;
}
function safe(value, fallback = 'Not recorded') {
  return value === null || value === undefined || value === '' ? fallback : value;
}
function bytes(value) {
  if (!Number.isFinite(value) || value < 0) return 'Not recorded';
  if (value < 1000) return `${number.format(value)} B`;
  const units = ['kB', 'MB', 'GB'];
  let n = value / 1000;
  let unit = 0;
  while (n >= 1000 && unit < units.length - 1) { n /= 1000; unit += 1; }
  return `${n.toFixed(n >= 100 ? 0 : n >= 10 ? 1 : 2)} ${units[unit]}`;
}
function duration(seconds, scope) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'Not recorded';
  const mins = seconds / 60;
  const shown = mins >= 60 ? `${(mins / 60).toFixed(1)} h` : `${mins.toFixed(mins >= 10 ? 0 : 1)} min`;
  return scope ? `${shown} (${scope})` : shown;
}
function assertData(data) {
  if (!data || data.schemaVersion !== 2 || !Array.isArray(data.rubric) || !Array.isArray(data.ratings)) {
    throw new Error('The ratings file is not a supported schema version.');
  }
  if (data.rubric.length !== 10 || data.rubric.reduce((sum, item) => sum + item.weight, 0) !== 100) throw new Error(`Expected 10 rubric categories weighted to 100, found ${data.rubric.length}.`);
  for (const rating of data.ratings) {
    const calculated = calculateTotal(rating.scores, data.rubric);
    if (calculated !== rating.total || calculateVisualScore(rating.scores,data.rubric)!==rating.visualScore) {
      throw new Error(`Published total for ${rating.id ?? 'unknown scene'} does not match its weighted category scores.`);
    }
  }
}
function groupLabelFor(group, data) {
  const sample = data.ratings.find((rating) => rating.group === group);
  return sample?.groupLabel || group;
}
function addMethod(data) {
  const method = data.methodology || {};
  const body = byId('methodBody');
  body.replaceChildren();
  const scope = node('section');
  scope.append(node('h2', '', 'Scope and calculation'));
  scope.append(node('p', '', safe(method.scope, 'Review scope not recorded.')));
  scope.append(node('p', '', safe(method.formula, 'Category weights are listed at right.')));
  if (data.reviewedAt) scope.append(node('p', '', `Reviewed ${data.reviewedAt}${data.snapshotCommit ? ` · source snapshot ${data.snapshotCommit}` : ''}`));
  if (method.coverageExample) scope.append(node('h2','','Why coverage matters'),node('p','',method.coverageExample));
  const protocol=node('ol');for(const text of method.acceptanceProtocol||[])protocol.append(node('li','',text));
  if(protocol.childElementCount) scope.append(node('h2','','How useful coverage will be measured'),protocol);
  body.append(scope);

  const rubricSection = node('section');
  rubricSection.append(node('h2', '', 'Weighted rubric'));
  const rubricList = node('ul', 'rubric');
  for (const item of data.rubric) {
    const li = node('li');
    const label = node('b', '', `${item.label} · ${item.weight}%`);
    li.append(label, document.createTextNode(` — ${safe(item.description, 'Description not recorded.')}`));
    if (item.anchors) li.append(node('p', '', typeof item.anchors === 'string' ? item.anchors : Object.entries(item.anchors).map(([key, value]) => `${key}: ${value}`).join(' · ')));
    rubricList.append(li);
  }
  rubricSection.append(rubricList);
  body.append(rubricSection);

  const limits = node('section');
  limits.append(node('h2', '', 'Unknowns and comparison limits'));
  limits.append(node('p', '', safe(method.unknownPolicy, 'Missing facts remain unrecorded.')));
  const limitList = node('ul');
  for (const text of method.comparisonLimits || []) limitList.append(node('li', '', text));
  if (!limitList.childElementCount) limitList.append(node('li', '', 'No additional comparison limits recorded.'));
  limits.append(limitList);
  body.append(limits);

  const preview = node('section');
  preview.append(node('h2', '', 'Evidence preview'));
  preview.append(node('p', '', safe(method.previewProtocol, 'Preview protocol not recorded.')));
  body.append(preview);
}
function addCostComparisons(data) {
  const body=byId('costBody');body.replaceChildren();
  body.append(node('p','','These compare costs for matched input extent, not proven useful metres. Compare the visual score alongside cost; a cheaper failed reconstruction is not a better finished street. Training is only one processing stage.'));
  for(const group of data.costComparisons||[]){
    const section=node('section','cost-group');section.append(node('h3','',group.label),node('p','small-note',group.scope));
    const wrap=node('div','table-scroll'),table=node('table','cost-table');
    const caption=node('caption','','Reference: '+group.referenceLabel+'. Ratios describe this capture only.');table.append(caption);
    const head=node('thead'),headrow=node('tr');for(const title of ['Model','Visual /100','Model MB','Bytes vs reference','Training min','Training vs reference'])headrow.append(node('th','',title));head.append(headrow);table.append(head);
    const rows=node('tbody');for(const item of group.rows){const row=node('tr');const cell=node('td'),link=node('a','',item.title);link.href='#'+item.id;cell.append(link);row.append(cell);
      for(const value of [item.visualScore,(item.assetBytes/1e6).toFixed(2),item.bytesRatio===null?'Not comparable':item.bytesRatio.toFixed(2)+'×',item.trainingSeconds===null?'Unknown':(item.trainingSeconds/60).toFixed(1),item.trainingRatio===null?'Not comparable':item.trainingRatio.toFixed(2)+'×'])row.append(node('td','',value));rows.append(row);}
    table.append(rows);wrap.append(table);section.append(wrap);const proof=node('a','small-note','Coverage audit and source hashes');proof.href='ratings/coverage-audit.json';section.append(proof);body.append(section);
  }
  body.append(node('p','small-note','Metres and accepted coverage are unknown for all current models. Capture seconds and image counts are retained in the audit as diagnostics, never converted into street length.'));
}

function makeFacts(rating) {
  const facts = rating.facts || {};
  const isPreview = rating.publicationType === 'native-render-preview';
  const section = node('section', 'detail-block');
  section.append(node('h3', '', 'Recorded facts'));
  const dl = node('dl', 'facts');
  const entries = [
    ['Packaged model', isPreview ? 'Not published' : bytes(facts.assetBytes)],
    ['Splats', Number.isFinite(facts.splats) ? number.format(facts.splats) : 'Not recorded'],
    ['Training time', duration(facts.trainingSeconds, facts.timeScope)],
    ['Training images', Number.isFinite(facts.images) ? number.format(facts.images) : 'Not recorded'],
    ['Image max width', Number.isFinite(facts.maxWidth) ? `${number.format(facts.maxWidth)} px` : 'Not recorded'],
    ['Human effort', Number.isFinite(facts.humanHours) ? `${facts.humanHours} h` : 'Unrecorded'],
    ['Accepted unique street length', 'Not measured'],
    ['MB per 100 usable metres', 'Not established'],
    ['Full quality + efficiency score', 'Pending measurements'],
  ];
  for (const [label, value] of entries) {
    const wrap = node('div');
    wrap.append(node('dt', '', label), node('dd', '', value));
    dl.append(wrap);
  }
  section.append(dl);
  if (facts.effortNote) section.append(node('p', 'small-note', facts.effortNote));
  return section;
}
function makeScores(rating, rubric) {
  const section = node('section', 'detail-block');
  section.append(node('h3', '', 'Category scores and reasons'));
  const byCategory = new Map(rating.scores.map((item) => [item.category, item]));
  const scoreList = node('div', 'score-list');
  for (const item of rubric) {
    const score = byCategory.get(item.id);
    const row = node('div', 'score');
    const label = node('div', 'score-label');
    label.append(document.createTextNode(item.label));
    const basisText = score?.score === null ? 'not measured comparably' : (score?.basis || 'judgment');
    label.append(node('span', 'score-basis', `${item.weight}% weight · ${basisText}`));
    const displayedScore = score.score === null ? 'Not scored' : `${score.score}/10`;
    const reason = node('div', 'score-reason', score.reason);
    const evidenceById = new Map((rating.evidence || []).map((item) => [item.id, item]));
    const evidenceLinks = node('span', 'score-evidence');
    for (const evidenceId of score.evidenceIds || []) {
      const itemEvidence = evidenceById.get(evidenceId);
      if (!itemEvidence?.url) continue;
      const link = node('a', '', itemEvidence.label || evidenceId);
      link.href = itemEvidence.url;
      link.target = '_blank';
      link.rel = 'noopener';
      evidenceLinks.append(link);
    }
    if (evidenceLinks.childElementCount) reason.append(evidenceLinks);
    row.append(label, node('div', 'score-value', displayedScore), reason);
    scoreList.append(row);
  }
  section.append(scoreList);
  return section;
}
function makeEvidence(rating) {
  const section = node('section', 'detail-block');
  section.append(node('h3', '', 'Review evidence'));
  const wrap = node('div', 'evidence');
  for (const item of rating.evidence || []) {
    const card = node('article', 'evidence-item');
    if (item.kind === 'image') {
      const image = node('img', 'evidence-image');
      image.src = item.url;
      image.alt = item.label ? `Review frame: ${item.label}` : `Review frame for ${rating.title}`;
      image.loading = 'lazy';
      image.decoding = 'async';
      card.append(image);
    }
    const caption = node('div', 'evidence-caption');
    caption.append(node('b', '', item.label || item.id || 'Evidence'));
    if (item.note) caption.append(node('p', '', item.note));
    const actions = node('div', 'evidence-actions');
    if (item.kind === 'video' || item.kind === 'native') {
      const play = node('button', '', item.kind === 'native' ? 'Load native render' : 'Load review clip');
      if (item.kind === 'native') play.setAttribute('aria-label', `Load native render: ${item.label || item.id}`);
      play.type = 'button';
      play.addEventListener('click', () => {
        if (play.dataset.loaded === 'true') return;
        const video = node('video', 'review-video');
        video.controls = true;
        video.playsInline = true;
        video.preload = 'metadata';
        if (item.url) video.src = item.url;
        if (item.poster) video.poster = item.poster;
        play.dataset.loaded = 'true';
        play.replaceWith(video);
        video.load();
      }, { once: true });
      actions.append(play);
    }
    if (item.url) {
      const link = node('a', '', item.kind === 'native' ? 'Open native evidence ↗' : 'Open evidence file ↗');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener';
      actions.append(link);
    }
    if (actions.childElementCount) caption.append(actions);
    card.append(caption);
    wrap.append(card);
  }
  if (!wrap.childElementCount) wrap.append(node('p', '', 'No review evidence is linked for this scene.'));
  section.append(wrap);
  return section;
}
function makeRating(rating, rubric) {
  const isPreview = rating.publicationType === 'native-render-preview';
  const details = node('details', 'ranking');
  details.id = rating.id;
  details.dataset.group = rating.group;
  const summary = node('summary');
  const rank = node('span', 'rank', `#${rating.rank}`);
  const name = node('span');
  name.append(node('span', 'scene-title', rating.title));
  name.append(node('span', 'scene-group', isPreview ? 'Native-render review · interactive model not published' : (rating.groupLabel || rating.group || 'Unmatched cohort')));
  const total = node('span', 'total');
  total.append(document.createTextNode(String(rating.visualScore)), node('small', '', ' / 100'), node('small', 'score-type', 'visual only'));
  const size = node('span', 'size', isPreview ? 'Model · not published' : `Size · ${bytes(rating.facts?.assetBytes)}`);
  const verdict = node('span', 'verdict', safe(rating.verdict, 'No concise verdict recorded.'));
  const chevron = node('span', 'chevron', '›');
  chevron.setAttribute('aria-hidden', 'true');
  summary.append(rank, name, total, size, verdict, chevron);
  details.append(summary);

  const detail = node('div', 'detail');
  const left = node('div');
  const visualSummary = node('p', 'visual-summary');
  visualSummary.append(node('b', '', `Visual subtotal · ${Number(rating.visualTotal).toFixed(1)} / 65`));
  visualSummary.append(node('span', '', 'Overall quality + efficiency: pending'));
  visualSummary.append(node('small', '', 'Five visual categories assessed. Cost and performance need useful-coverage measurements; no placeholder points are included.'));
  left.append(visualSummary, makeScores(rating, rubric));
  const notes = node('div', 'detail-grid');
  const best = node('section', 'detail-block');
  best.append(node('h3', '', 'Best suited to'), node('p', '', safe(rating.bestFor)));
  notes.append(best);
  const issue = node('section', 'detail-block');
  issue.append(node('h3', '', 'Main limitation'), node('p', '', safe(rating.mainIssue)));
  notes.append(issue);
  if (rating.comparisons?.length) {
    const comparisons = node('section', 'detail-block');
    comparisons.append(node('h3', '', 'Matched comparison notes'));
    const ul = node('ul');
    for (const note of rating.comparisons) ul.append(node('li', '', note));
    comparisons.append(ul);
    notes.append(comparisons);
  }
  if (rating.confidence) {
    const confidence = node('section', 'detail-block');
    confidence.append(node('h3', '', 'Confidence'), node('p', '', rating.confidence));
    notes.append(confidence);
  }
  left.append(notes);
  left.append(makeFacts(rating));
  const right = node('div');
  right.append(makeEvidence(rating));
  if (!isPreview) {
    const explore = node('a', 'explore', 'Explore this scene ↗');
    explore.href = `demos/splat-explorer-v1/?scene=${encodeURIComponent(rating.id)}`;
    right.append(explore);
  }
  detail.append(left, right);
  details.append(detail);
  return details;
}
function installFilters(ratings) {
  const distinct = [...new Set(ratings.map((rating) => rating.group).filter(Boolean))];
  for (const group of distinct) {
    const button = node('button', '', groupLabelFor(group, { ratings }));
    button.type = 'button';
    button.dataset.group = group;
    button.setAttribute('aria-pressed', 'false');
    groups.insertBefore(button, byId('filterCount'));
  }
  const filter = (selected) => {
    let visible = 0;
    for (const card of list.querySelectorAll('.ranking')) {
      card.hidden = selected !== 'all' && card.dataset.group !== selected;
      if (!card.hidden) visible += 1;
    }
    for (const button of groups.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.group === selected));
    byId('filterCount').textContent = `${visible} of ${ratings.length} results`;
  };
  groups.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-group]');
    if (button) filter(button.dataset.group);
  });
  filter('all');
}
async function main() {
  try {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error(`Could not load ratings.json (${response.status}).`);
    const data = await response.json();
    assertData(data);
    const ranked = rankRatings(data.ratings);
    addMethod(data);
    addCostComparisons(data);
    list.replaceChildren(...ranked.map((rating) => makeRating(rating, data.rubric)));
    installFilters(ranked);
    const openHashRating = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (target?.matches('.ranking')) { if(target.hidden)groups.querySelector('button[data-group=all]').click(); target.open = true; target.scrollIntoView({ block: 'start' }); }
    };
    window.addEventListener('hashchange', openHashRating);
    openHashRating();
    const interactiveCount = ranked.filter((rating) => rating.publicationType !== 'native-render-preview').length;
    const previewCount = ranked.length - interactiveCount;
    byId('pageSummary').replaceChildren(node('span', 'dot'), node('span', '', `${ranked.length} ranked results · ${interactiveCount} interactive models + ${previewCount} native-render previews · reviewed ${safe(data.reviewedAt, 'date not recorded')} · visual ranking only · 5 of 10 categories assessed · efficiency pending`));

  } catch (error) {
    errorBox.hidden = false;
    errorBox.textContent = error instanceof Error ? error.message : 'Could not load the ratings data.';
    byId('pageSummary').replaceChildren(node('span', 'dot'), node('span', '', 'Ratings could not be loaded'));
    byId('methodBody').replaceChildren(node('p', '', 'Method details are unavailable until a valid ratings file is available.'));
  }
}
main();
