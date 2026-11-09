import type { Metadata } from "next";
import ReaderEmbed from "../../components/ReaderEmbed";

export const metadata: Metadata = {
  title: "Curriculum standards · ScrollyTale",
  description: "The NGSS standards for the Biology course, set against its six units",
};

/**
 * The reader's standards page, which the tale calls Curriculum Mapping in the
 * footer. One page, one name in the reader, one name here: the student is
 * looking at the same document either way.
 */
export default function CurriculumPage() {
  return <ReaderEmbed page="standards" title="Curriculum standards" />;
}
