import type { Metadata } from "next";
import ReaderEmbed from "../../components/ReaderEmbed";

export const metadata: Metadata = {
  title: "Glossary · ScrollyTale",
  description: "Every term in the Biology reader, with what it is built on and what it leads to",
};

/**
 * The reader's own glossary, map and all. See ReaderEmbed for why this is a
 * frame rather than a second implementation.
 */
export default function GlossaryPage() {
  return <ReaderEmbed page="glossary" title="Glossary" />;
}
