export interface ApplicationEntryPolicy {
  allows(url: string): boolean;
}

export function createApplicationEntryPolicy(
  entry: string,
  isPackaged: boolean,
): ApplicationEntryPolicy {
  const expected = new URL(entry);
  if (
    expected.username ||
    expected.password ||
    expected.hash ||
    (isPackaged
      ? expected.protocol !== "file:"
      : !["http:", "https:"].includes(expected.protocol))
  ) {
    throw new Error("Invalid application entry policy");
  }

  // A file origin is shared by unrelated documents. Pin parsed URL components,
  // including the document path, rather than trusting that origin or a prefix.
  // Development pins its active origin separately from its entry path as well.
  return Object.freeze({
    allows(url: string): boolean {
      try {
        const candidate = new URL(url);
        return (
          !candidate.username &&
          !candidate.password &&
          candidate.protocol === expected.protocol &&
          candidate.host === expected.host &&
          candidate.origin === expected.origin &&
          candidate.pathname === expected.pathname &&
          candidate.search === expected.search
        );
      } catch {
        return false;
      }
    },
  });
}

export function isExternalApplicationLink(url: string): boolean {
  try {
    return ["https:", "http:", "mailto:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}
