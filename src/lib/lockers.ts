// Demo parcel lockers, two per region. A real version would come from a locker network's API.
import type { RegionId } from "./areas";

export interface Locker {
  id: string;
  name: string;
  area: string;
  region: RegionId;
}

export const LOCKERS: Locker[] = [
  { id: "kings-cross-station", name: "King's Cross station locker", area: "kings-cross", region: "central" },
  { id: "soho-square", name: "Soho Square locker", area: "soho", region: "central" },
  { id: "camden-market", name: "Camden Market locker", area: "camden", region: "north" },
  { id: "highbury-corner", name: "Highbury Corner locker", area: "islington", region: "north" },
  { id: "hackney-central", name: "Hackney Central locker", area: "hackney", region: "east" },
  { id: "westfield-stratford", name: "Westfield Stratford locker", area: "stratford", region: "east" },
  { id: "brixton-station", name: "Brixton station locker", area: "brixton", region: "south" },
  { id: "clapham-junction", name: "Clapham Junction locker", area: "battersea", region: "south" },
  { id: "hammersmith-broadway", name: "Hammersmith Broadway locker", area: "hammersmith", region: "west" },
  { id: "notting-hill-gate", name: "Notting Hill Gate locker", area: "notting-hill", region: "west" },
];

export function getLocker(id: string | null | undefined): Locker | undefined {
  return id ? LOCKERS.find((l) => l.id === id) : undefined;
}
