import PlantsApp from "@/components/PlantsApp";

// Stays a Server Component: it renders no dynamic data, so "/" is prerendered
// static and no plant data ever exists server-side.
export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <PlantsApp />
    </main>
  );
}
