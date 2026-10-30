/** Map catalog ids to the quota family used by automatic account switching. */
export function quotaFamilyForModel(modelId) {
  if (modelId === "gemini-4-argon") return "argon";
  if (String(modelId).startsWith("gemini-")) return "gemini";
  return "3p";
}

/** Avoid treating Argon's `gemini-argon-*` bucket as ordinary Gemini usage. */
export function quotaBucketMatchesFamily(family, bucketId) {
  const id = String(bucketId ?? "");
  if (family === "argon") return id.startsWith("gemini-argon-");
  if (family === "gemini") return id.startsWith("gemini-") && !id.startsWith("gemini-argon-");
  return id.startsWith("3p-");
}

/**
 * Return whether a family has reached the automatic-switch threshold.
 * `null` means no matching quota was reported; unknown quota must never make an
 * account eligible as a switch target.
 */
export function quotaFamilyAtThreshold(data, family, thresholdPct = 80) {
  const buckets = (data?.groups ?? []).flatMap((group) => group.buckets ?? []);
  const matching = buckets.filter((bucket) => quotaBucketMatchesFamily(family, bucket.bucketId));
  const reported = matching.filter((bucket) => Number.isFinite(bucket.remainingFraction));
  if (!reported.length) return null;
  return reported.some((bucket) => (1 - bucket.remainingFraction) * 100 >= thresholdPct);
}

const QUOTA_FAMILIES = ["gemini", "3p", "argon"];

/**
 * A legacy `exhausted: true` means every family was locked. New locks are
 * stored per family so a Claude 429 does not make Gemini unusable.
 */
export function isFamilyExhausted(account, family) {
  if (!account) return false;
  if (Array.isArray(account.exhaustedFamilies)) return account.exhaustedFamilies.includes(family);
  return Boolean(account.exhausted);
}

export function markFamilyExhausted(account, family) {
  const families = new Set(
    Array.isArray(account.exhaustedFamilies)
      ? account.exhaustedFamilies
      : account.exhausted
        ? QUOTA_FAMILIES
        : [],
  );
  families.add(family);
  account.exhaustedFamilies = [...families];
  delete account.exhausted;
}

export function clearFamilyExhausted(account, family) {
  if (!Array.isArray(account.exhaustedFamilies)) {
    if (!account.exhausted) return;
    account.exhaustedFamilies = QUOTA_FAMILIES.filter((id) => id !== family);
    delete account.exhausted;
  } else {
    account.exhaustedFamilies = account.exhaustedFamilies.filter((id) => id !== family);
  }
  if (!account.exhaustedFamilies.length) delete account.exhaustedFamilies;
}

export function clearAllExhaustion(account) {
  delete account.exhausted;
  delete account.exhaustedFamilies;
}

/**
 * Drop a family lock once that family's own quota is above zero. A missing
 * report is not treated as recovered. A legacy global lock is split into
 * families first, so one healthy family cannot unlock a family that is still empty.
 */
export function recoverExhaustedFamilies(account, groups) {
  if (!account || (!account.exhausted && !account.exhaustedFamilies?.length)) return false;
  const before = JSON.stringify([Boolean(account.exhausted), account.exhaustedFamilies ?? null]);
  if (!Array.isArray(account.exhaustedFamilies) && account.exhausted) {
    account.exhaustedFamilies = [...QUOTA_FAMILIES];
    delete account.exhausted;
  }
  account.exhaustedFamilies = account.exhaustedFamilies.filter((family) => {
    const group = (groups ?? []).find((item) => item.id === family);
    const windows = [group?.fiveHour?.remainingFraction, group?.weekly?.remainingFraction].filter((value) =>
      Number.isFinite(value),
    );
    // Keep the lock while any reported window is still empty. One healthy
    // window in another family must not clear this family.
    return windows.length === 0 || windows.some((value) => value <= 0);
  });
  if (!account.exhaustedFamilies.length) delete account.exhaustedFamilies;
  return before !== JSON.stringify([Boolean(account.exhausted), account.exhaustedFamilies ?? null]);
}
