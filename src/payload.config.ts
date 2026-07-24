import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import sharp from "sharp";

import { Users } from "./collections/Users";
import { Media } from "./collections/Media";
import { Players } from "./collections/Players";
import { Venues } from "./collections/Venues";
import { Articles } from "./collections/Articles";
import { Championships } from "./collections/Championships";
import { LeaderboardEntries } from "./collections/LeaderboardEntries";
import { TeeTimeRounds } from "./collections/TeeTimeRounds";
import { PlayerStatistics } from "./collections/PlayerStatistics";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Players, Venues, Articles, Championships, LeaderboardEntries, TeeTimeRounds, PlayerStatistics],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || "",
    },
  }),
  sharp,
  plugins: [],
});
