import type { GlobalConfig } from "payload";

import { revalidateSite } from "@/lib/revalidate";

export const TournamentStatus: GlobalConfig = {
  slug: "tournament-status",
  label: "Tournament Status",
  access: {
    read: () => true,
  },
  hooks: {
    afterChange: [revalidateSite],
  },
  fields: [
    {
      name: "competitionComplete",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "Leave unchecked while the competition is live — every leaderboard row looks the same. Check it once the result is final to promote 1st, 2nd and 3rd place with champion styling.",
      },
    },
  ],
};
