function normalize(value) {
  if (value === null || value === undefined) return null;
  return String(value).trim();
}

function createMapBy(data, keySelector) {
  const map = new Map();

  data.forEach((item) => {
    const key = normalize(keySelector(item));

    if (key) {
      map.set(key, item);
    }
  });

  return map;
}

function createSetMapBy(data, keySelector, valueSelector) {
  const map = new Map();

  data.forEach((item) => {
    const key = normalize(keySelector(item));
    const value = normalize(valueSelector(item));

    if (!key || !value) return;

    if (!map.has(key)) {
      map.set(key, new Set());
    }

    map.get(key).add(value);
  });

  return map;
}

function getUnionKeys(...maps) {
  return new Set(
    maps.flatMap((map) => [...map.keys()])
  );
}

function areSetsEqual(firstSet, secondSet) {
  if (firstSet.size !== secondSet.size) return false;

  return [...firstSet].every((value) => secondSet.has(value));
}

function formatSet(set) {
  return set && set.size ? [...set].join(', ') : null;
}

function groupBy(data, keySelector, valueSelector) {
  const map = new Map();

  data.forEach((item) => {
    const key = normalize(keySelector(item));
    const value = normalize(valueSelector(item));

    if (!key) return;

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(value);
  });

  return map;
}

module.exports = {
  normalize,
  createMapBy,
  createSetMapBy,
  getUnionKeys,
  areSetsEqual,
  formatSet,
  groupBy
};