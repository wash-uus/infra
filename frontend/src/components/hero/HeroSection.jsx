import DynamicCollage from "./DynamicCollage";
import OverlayLayer from "./OverlayLayer";
import TextContent from "./TextContent";

export default function HeroSection() {
  return (
    <section className="relative h-screen min-h-[680px] w-full overflow-hidden bg-black">
      <DynamicCollage />
      <OverlayLayer />
      <TextContent />
    </section>
  );
}
