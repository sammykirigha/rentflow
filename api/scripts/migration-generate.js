#!/usr/bin/env node
const { execSync } = require("child_process");
const { console } = require("inspector");

const name = process.argv[2] || "Migration";
const cmd = `npx ts-node -P ./tsconfig.json -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate -d ./src/config/database.config.ts ./src/database/migrations/${name}`;

try {
    execSync(cmd, { stdio: "inherit" });
} catch (error) {
    const msg = error.stderr?.toString() || error.stdout?.toString() || "";
    if (msg.includes("No changes in database schema were found")) {
        console.log(
            "\x1b[33m⚠️  No schema changes detected. No migration was generated.\x1b[0m"
        );
    }
    console.error(error);
    process.exit(0); // ✅ graceful exit
}
