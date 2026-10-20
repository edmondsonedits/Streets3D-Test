export function calculateTotal(scores, rubric) {
  if (!Array.isArray(rubric) || rubric.length === 0) throw new TypeError('Rubric must contain at least one category.');
  if (!Array.isArray(scores)) throw new TypeError('Scores must be an array.');
  const ids = rubric.map((item) => item?.id);
  if (ids.some((id) => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) {
    throw new TypeError('Rubric categories must have unique non-empty ids.');
  }
  const weightTotal = rubric.reduce((sum, item) => {
    if (!Number.isFinite(item.weight) || item.weight < 0) throw new RangeError(`Invalid weight for ${item.id}.`);
    return sum + item.weight;
  }, 0);
  if (weightTotal !== 100) throw new RangeError('Rubric weights must total 100.');

  const scoreByCategory = new Map();
  for (const entry of scores) {
    if (!entry || typeof entry.category !== 'string') throw new TypeError('Each score must identify a category.');
    if (scoreByCategory.has(entry.category)) throw new TypeError(`Duplicate score for ${entry.category}.`);
    if (!ids.includes(entry.category)) throw new TypeError(`Unknown score category ${entry.category}.`);
    if (!Number.isFinite(entry.score) || entry.score < 0 || entry.score > 10) {
      throw new RangeError(`Score for ${entry.category} must be between 0 and 10.`);
    }
    scoreByCategory.set(entry.category, entry.score);
  }
  const missing = ids.filter((id) => !scoreByCategory.has(id));
  if (missing.length) throw new TypeError(`Missing score categories: ${missing.join(', ')}.`);
  return Math.round(rubric.reduce((sum, item) => sum + scoreByCategory.get(item.id) * item.weight / 10, 0));
}

export function rankRatings(ratings) {
  if (!Array.isArray(ratings)) throw new TypeError('Ratings must be an array.');
  const seen = new Set();
  const ordered = ratings.map((rating) => {
    if (!rating || typeof rating.id !== 'string' || !rating.id) throw new TypeError('Each rating needs a non-empty id.');
    if (seen.has(rating.id)) throw new TypeError(`Duplicate rating id ${rating.id}.`);
    seen.add(rating.id);
    if (!Number.isFinite(rating.total) || rating.total < 0 || rating.total > 100) {
      throw new RangeError(`Total for ${rating.id} must be between 0 and 100.`);
    }
    return rating;
  }).sort((a, b) => b.total - a.total || a.id.localeCompare(b.id));
  let priorTotal;
  let rank = 0;
  return ordered.map((rating, index) => {
    if (rating.total !== priorTotal) rank = index + 1;
    priorTotal = rating.total;
    return { ...rating, rank };
  });
}
