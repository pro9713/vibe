import VibeLoader from "@/app/components/VibeLoader";

export default function ProductLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      <VibeLoader fullScreen={false} size="md" />
    </div>
  );
}
