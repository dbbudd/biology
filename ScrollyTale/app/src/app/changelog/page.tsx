import type { Metadata } from "next";
import ReaderEmbed from "../../components/ReaderEmbed";

export const metadata: Metadata = {
  title: "Change log · ScrollyTale",
  description: "What has changed in the Biology reader, newest first",
};

/**
 * The reader's change log. It is built from the repository's own issues, so it
 * is the reader's document, not a copy that would go stale here.
 */
export default function ChangelogPage() {
  return <ReaderEmbed page="changelog" title="Change log" />;
}
