import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SkillDuel — 1v1 Skill Challenges on GenLayer",
  description: "Prove your skill in 1v1 challenges judged by decentralized AI consensus. Stake GEN, submit your answer, winner takes the pot.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
