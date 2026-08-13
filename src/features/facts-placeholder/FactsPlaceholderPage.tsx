import { Squiggle } from "../../components/ui/Squiggle";

export function FactsPlaceholderPage() {
  return (
    <div className="screen">
      <div className="coming-screen">
        <h1 className="display-heading">Tulossa</h1>
        <Squiggle weight={1.4} opacity={0.5} />
      </div>
    </div>
  );
}
