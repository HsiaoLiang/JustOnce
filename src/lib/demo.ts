// Demo-mode switches. The quick log-in buttons only ever work for the seeded
// demo accounts, whose password is published in the README anyway.

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export type DemoAccount = {
  email: string;
  name: string;
  role: "Renter" | "Owner";
  note: string;
  avatar?: string;
  /** Short name of the community this account is verified in. */
  community: string;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "martin@example.com", name: "Martin Hsiao", role: "Renter", community: "LBS", note: "MBA student, asking for a calculator on the board" },
  { email: "sophie@example.com", name: "Sophie Clarke", role: "Renter", community: "LBS", note: "Has an active rental and a request waiting", avatar: "/seed/avatars/sophie.jpg" },
  { email: "oliver@example.com", name: "Oliver Bennett", role: "Owner", community: "LBS", note: "Suits and watches, a Rolex request to answer", avatar: "/seed/avatars/oliver.jpg" },
  { email: "priya@example.com", name: "Priya Shah", role: "Owner", community: "Imperial", note: "Lends cameras, has requests to answer", avatar: "/seed/avatars/priya.jpg" },
  { email: "tom@example.com", name: "Tom Hughes", role: "Owner", community: "Imperial", note: "Tents and camping kit", avatar: "/seed/avatars/tom.jpg" },
  { email: "amara@example.com", name: "Amara Okafor", role: "Owner", community: "UCL", note: "Dresses, costumes and Halloween props", avatar: "/seed/avatars/amara.jpg" },
  { email: "hannah@example.com", name: "Hannah Brooks", role: "Owner", community: "UCL", note: "Ball gowns for the Summer Ball", avatar: "/seed/avatars/hannah.jpg" },
  { email: "leo@example.com", name: "Leo Martins", role: "Renter", community: "Google UK", note: "Waiting on a camera request", avatar: "/seed/avatars/leo.jpg" },
  { email: "isla@example.com", name: "Isla Fraser", role: "Owner", community: "Google UK", note: "Bell tent and wardrobe pieces" },
  { email: "daniel@example.com", name: "Daniel Reyes", role: "Owner", community: "Meta", note: "Suits and a Canon DSLR", avatar: "/seed/avatars/daniel.jpg" },
  { email: "ruby@example.com", name: "Ruby Patel", role: "Renter", community: "Meta", note: "Looking for a standing desk" },
];

export const DEMO_COMMUNITY_ORDER = ["LBS", "Imperial", "UCL", "Google UK", "Meta"] as const;

export const DEMO_PASSWORD_HINT = "justonce";
