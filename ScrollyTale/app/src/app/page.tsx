import TaleWorkspace from "../components/TaleWorkspace";
import { sealedGardenTale } from "../data/tales/u2-sealed-garden";
import { UNIT_2_CHAPTERS } from "../data/toc.generated";

export default function Home() {
  return <TaleWorkspace tale={sealedGardenTale} chapters={UNIT_2_CHAPTERS} />;
}
