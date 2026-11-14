// Demo-mode switches. The quick log-in buttons only ever work for the seeded
// demo accounts, whose password is published in the README anyway.

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export const DEMO_ACCOUNTS = [
  { email: "sophie@example.com", name: "Sophie Clarke", role: "Renter", note: "Has an active rental and a request waiting", avatar: "/seed/avatars/sophie.jpg" },
  { email: "priya@example.com", name: "Priya Shah", role: "Owner", note: "Lends cameras, has requests to answer", avatar: "/seed/avatars/priya.jpg" },
  { email: "amara@example.com", name: "Amara Okafor", role: "Owner", note: "Dresses, costumes and Halloween props", avatar: "/seed/avatars/amara.jpg" },
  { email: "leo@example.com", name: "Leo Martins", role: "Renter", note: "Waiting on a camera request", avatar: "/seed/avatars/leo.jpg" },
  { email: "tom@example.com", name: "Tom Hughes", role: "Owner", note: "Tents and camping kit", avatar: "/seed/avatars/tom.jpg" },
  { email: "oliver@example.com", name: "Oliver Bennett", role: "Owner", note: "Suits and watches, a Rolex request to answer", avatar: "/seed/avatars/oliver.jpg" },
] as const;

export const DEMO_PASSWORD_HINT = "justonce";
